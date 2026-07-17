import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import {
  validatePluginManifest,
  type DbAdapter,
  type DbQuery,
  type DbRepository,
  type DbTransaction,
  type NamespaceContext
} from "@trinacria-cms/kernel";
import {
  MEDIA_ACL_ENTRIES_ENTITY,
  MEDIA_ASSETS_ENTITY,
  MEDIA_DIRECTORIES_ENTITY,
  MEDIA_PACK_MANIFEST,
  MEDIA_PACK_PERMISSION_KEY_LIST,
  MEDIA_PACK_SETTING_DEFINITIONS,
  LocalDiskMediaStorageProvider,
  MediaAssetsRepository,
  MediaAssetsService,
  MediaDomainEventsService,
  MediaDirectoriesRepository,
  MediaDirectoriesService,
  MediaUploadsRepository,
  MediaUploadsService,
  MediaProviderRegistry,
  type MediaStorageProvider,
  type MediaStorageConfigService
} from "../src/index.js";
import { parseCsv, serializeCsv } from "../src/admin/file-manager/csv-editor.js";

test("media-pack manifest declares its foundation contributions", () => {
  const manifest = validatePluginManifest(MEDIA_PACK_MANIFEST);

  assert.equal(manifest.id, "media-pack");
  assert.deepEqual(manifest.dependencies, [
    { pluginId: "core-pack", versionRange: "^0.1.0", optional: false }
  ]);
  assert.deepEqual(
    manifest.entities.map((entity) => entity.name),
    ["assets", "directories", "acl_entries", "uploads"]
  );
  assert.deepEqual(
    manifest.settings.map((setting) => setting.key).sort(),
    MEDIA_PACK_SETTING_DEFINITIONS.map((setting) => setting.key).sort()
  );
  const mediaWidget = manifest.admin?.widgets?.[0];
  assert.equal(mediaWidget?.id, "media-file-manager");
  assert.equal(mediaWidget?.componentRef, "media-pack:file-manager-widget");
  assert.equal(mediaWidget?.requiredPermission, "media-pack:assets:read");
  assert.deepEqual(mediaWidget?.layout ? { ...mediaWidget.layout } : undefined, {
    defaultColumnSpan: 2,
    defaultRowSpan: 2,
    minColumnSpan: 2,
    maxColumnSpan: 4,
    minRowSpan: 2,
    maxRowSpan: 3
  });
  assert.deepEqual(
    manifest.security?.grants?.find((grant) => grant.roleCode === "admin")?.permissionKeys,
    MEDIA_PACK_PERMISSION_KEY_LIST
  );
});

test("media-pack entities expose the required namespace-local indexes", () => {
  assert.equal(MEDIA_ASSETS_ENTITY.entityName, "assets");
  assert.equal(MEDIA_DIRECTORIES_ENTITY.entityName, "directories");
  assert.equal(MEDIA_ACL_ENTRIES_ENTITY.entityName, "acl_entries");
  assert.equal(
    MEDIA_ASSETS_ENTITY.indexes?.some((index) => index.name === "assets_storage_unique"),
    true
  );
  assert.equal(
    MEDIA_ACL_ENTRIES_ENTITY.indexes?.some(
      (index) => index.name === "acl_entries_target_principal_unique"
    ),
    true
  );
});

test("CSV editor preserves quoted values, delimiters and multiline cells", () => {
  const source = 'name;note\r\n"Trinacria";"prima riga\nseconda riga"\r\n"A;B";"dice ""ciao"""';
  const document = parseCsv(source);

  assert.equal(document.delimiter, ";");
  assert.deepEqual(document.rows, [
    ["name", "note"],
    ["Trinacria", "prima riga\nseconda riga"],
    ["A;B", 'dice "ciao"']
  ]);
  assert.deepEqual(parseCsv(serializeCsv(document)), document);
});

test("MediaProviderRegistry rejects malformed and duplicate provider registrations", () => {
  const registry = new MediaProviderRegistry();
  const provider = createProvider("local-disk");

  registry.register(provider);
  assert.equal(registry.get("local-disk"), provider);
  assert.deepEqual(registry.list(), [provider]);
  assert.throws(() => registry.register(provider), /already registered/);
  assert.throws(() => registry.register(createProvider("S3")), /lowercase and trimmed/);
  assert.throws(() => registry.get("missing"), /not registered/);
});

test("MediaAssetsService enforces state, visibility and explicit sharing", async () => {
  const service = new MediaAssetsService(new MediaAssetsRepository(createFakeDbAdapter()));
  const asset = await service.createAsset({
    ownerUserId: "owner",
    uploadedByUserId: "owner",
    displayName: "Launch image",
    originalFilename: "launch.jpg",
    mimeType: "image/jpeg",
    byteSize: 5,
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    providerId: "local-disk",
    storageKey: "assets/launch.jpg"
  });

  assert.deepEqual(
    await service.validateUse({
      references: [{ assetId: asset.id }],
      actor: { userId: "owner" },
      purpose: "authoring"
    }),
    [{ assetId: asset.id, usable: true }]
  );
  assert.deepEqual(
    await service.validateUse({
      references: [{ assetId: asset.id }],
      actor: { userId: "reader" },
      purpose: "authoring"
    }),
    [{ assetId: asset.id, usable: false, reason: "access_denied" }]
  );

  await service.shareAsset({
    assetId: asset.id,
    principalType: "user",
    principalId: "reader",
    actions: ["read"],
    createdByUserId: "owner"
  });
  assert.deepEqual(
    await service.validateUse({
      references: [{ assetId: asset.id }],
      actor: { userId: "reader" },
      purpose: "authoring"
    }),
    [{ assetId: asset.id, usable: true }]
  );
  assert.deepEqual(
    await service.validateUse({
      references: [{ assetId: asset.id }],
      actor: { userId: "owner", pluginId: "editorial-pack" },
      purpose: "publication"
    }),
    [{ assetId: asset.id, usable: false, reason: "not_publishable" }]
  );

  await service.updateAssetVisibility(asset.id, "public");
  assert.deepEqual(
    await service.validateUse({
      references: [{ assetId: asset.id }],
      actor: { pluginId: "editorial-pack" },
      purpose: "publication"
    }),
    [{ assetId: asset.id, usable: true }]
  );

  await service.deleteAsset(asset.id);
  assert.deepEqual(
    await service.validateUse({
      references: [{ assetId: asset.id }],
      actor: { userId: "owner" },
      purpose: "authoring"
    }),
    [{ assetId: asset.id, usable: false, reason: "deleted" }]
  );
});

test("MediaAssetsService inherits access grants from an ACL-enabled directory", async () => {
  const db = createFakeDbAdapter();
  const directories = new MediaDirectoriesRepository(db);
  const service = new MediaAssetsService(new MediaAssetsRepository(db), directories);
  const directory = await directories.create({
    ownerUserId: "owner",
    name: "Campaign",
    inheritAcl: false
  });
  const asset = await service.createAsset({
    ownerUserId: "owner",
    uploadedByUserId: "owner",
    directoryId: directory.id,
    displayName: "Campaign PDF",
    originalFilename: "campaign.pdf",
    mimeType: "application/pdf",
    byteSize: 5,
    checksum: { algorithm: "sha256", value: "b".repeat(64) },
    providerId: "local-disk",
    storageKey: "assets/campaign.pdf"
  });

  await service.shareDirectory({
    directoryId: directory.id,
    principalType: "role",
    principalId: "editor",
    actions: ["read"],
    createdByUserId: "owner"
  });

  assert.equal(await service.canAccessAsset(asset.id, { roleCodes: ["editor"] }, "read"), true);
});

test("MediaAssetsService keeps moved assets out of their previous directory", async () => {
  const service = new MediaAssetsService(new MediaAssetsRepository(createFakeDbAdapter()));
  const baseInput = {
    ownerUserId: "owner",
    uploadedByUserId: "owner",
    mimeType: "text/plain",
    byteSize: 5,
    checksum: { algorithm: "sha256" as const, value: "c".repeat(64) },
    providerId: "local-disk",
    storageKey: "assets/file.txt"
  };
  const asset = await service.createAsset({
    ...baseInput,
    displayName: "File",
    originalFilename: "file.txt"
  });

  assert.deepEqual(
    (await service.listAssets({ rootOnly: true })).map((entry) => entry.id),
    [asset.id]
  );

  await service.updateAsset(asset.id, { directoryId: "destination" });

  assert.deepEqual(await service.listAssets({ rootOnly: true }), []);
  assert.deepEqual(
    (await service.listAssets({ directoryId: "destination" })).map((entry) => entry.id),
    [asset.id]
  );
});

test("MediaDirectoriesService prevents cycles and deletion of directories containing assets", async () => {
  const db = createFakeDbAdapter();
  const directoryRepository = new MediaDirectoriesRepository(db);
  const assetRepository = new MediaAssetsRepository(db);
  const directories = new MediaDirectoriesService(directoryRepository, assetRepository);
  const root = await directories.createDirectory({ ownerUserId: "owner", name: "Root" });
  const child = await directories.createDirectory({
    ownerUserId: "owner",
    name: "Child",
    parentId: root.id
  });

  await assert.rejects(
    directories.updateDirectory(root.id, { parentId: child.id }),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "media_directory_cycle"
  );

  await assetRepository.create({
    directoryId: child.id,
    ownerUserId: "owner",
    uploadedByUserId: "owner",
    displayName: "notes.txt",
    originalFilename: "notes.txt",
    mimeType: "text/plain",
    byteSize: 5,
    checksum: { algorithm: "sha256", value: "a".repeat(64) },
    providerId: "local-disk",
    storageKey: "assets/notes"
  });
  await assert.rejects(
    directories.deleteDirectory(child.id),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "media_directory_not_empty"
  );
});

test("MediaUploadsService rejects uploads into directories without write access", async () => {
  const db = createFakeDbAdapter();
  const directoryRepository = new MediaDirectoriesRepository(db);
  const directory = await directoryRepository.create({ ownerUserId: "owner", name: "Private" });
  const providers = new MediaProviderRegistry();
  providers.register(createProvider("local-disk"));
  const assets = new MediaAssetsService(new MediaAssetsRepository(db), directoryRepository);
  const uploads = new MediaUploadsService(new MediaUploadsRepository(db), assets, providers);

  await assert.rejects(
    uploads.startUpload({
      ownerUserId: "intruder",
      directoryId: directory.id,
      filename: "notes.txt",
      mimeType: "text/plain",
      byteSize: 5
    }),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "media_directory_not_writable"
  );
});

test("replacing media shares removes omitted grants and increments the ACL version", async () => {
  const db = createFakeDbAdapter();
  const assets = new MediaAssetsService(new MediaAssetsRepository(db));
  const asset = await assets.createAsset({
    ownerUserId: "owner",
    uploadedByUserId: "owner",
    displayName: "notes.txt",
    originalFilename: "notes.txt",
    mimeType: "text/plain",
    byteSize: 5,
    checksum: { algorithm: "sha256", value: "b".repeat(64) },
    providerId: "local-disk",
    storageKey: "assets/shared-notes"
  });

  await assets.replaceAssetShares(asset.id, "owner", [
    { principalType: "user", principalId: "reader", actions: ["read"] },
    { principalType: "role", principalId: "editor", actions: ["read", "write"] }
  ]);
  const shares = await assets.replaceAssetShares(asset.id, "owner", [
    { principalType: "user", principalId: "reader", actions: ["read"] }
  ]);

  assert.deepEqual(
    shares.map((share) => `${share.principalType}:${share.principalId}`),
    ["user:reader"]
  );
  assert.equal((await assets.getAsset(asset.id))?.aclVersion, 3);
});

test("LocalDiskMediaStorageProvider stages, promotes and deletes opaque objects", async () => {
  const root = await mkdtemp(join(tmpdir(), "trinacria-media-pack-"));
  try {
    const provider = new LocalDiskMediaStorageProvider({ rootDirectory: root });
    const upload = await provider.createUpload({
      uploadId: "upload_1",
      storageKey: "assets/launch.jpg",
      contentType: "image/jpeg",
      expectedByteSize: 5
    });
    assert.equal(upload.method, "proxy");
    assert.match(upload.uploadUrl, /upload_1\/content$/);

    await provider.stageUpload("upload_1", Readable.from([Buffer.from("hello")]));
    const stored = await provider.completeUpload({
      uploadId: "upload_1",
      storageKey: "assets/launch.jpg"
    });
    assert.equal(stored.byteSize, 5);
    assert.equal(stored.checksum?.value, createHash("sha256").update("hello").digest("hex"));
    await stat(join(root, "assets", "launch.jpg"));

    const readUrl = await provider.createReadUrl({
      storageKey: "assets/launch.jpg",
      expiresInSeconds: 60
    });
    assert.match(
      readUrl.url,
      /^\/v1\/media\/local\/assets%2Flaunch\.jpg\?expires=\d+&signature=[a-f0-9]{64}$/
    );
    await provider.deleteObject({ storageKey: "assets/launch.jpg" });
    await assert.rejects(stat(join(root, "assets", "launch.jpg")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("MediaUploadsService creates a private ready asset from a staged upload", async () => {
  const root = await mkdtemp(join(tmpdir(), "trinacria-media-upload-"));
  try {
    const png = createPngHeader(640, 480);
    const db = createFakeDbAdapter();
    const providers = new MediaProviderRegistry();
    providers.register(new LocalDiskMediaStorageProvider({ rootDirectory: root }));
    const assets = new MediaAssetsService(new MediaAssetsRepository(db));
    const uploads = new MediaUploadsService(new MediaUploadsRepository(db), assets, providers);

    const started = await uploads.startUpload({
      ownerUserId: "owner",
      filename: "launch.png",
      mimeType: "image/png",
      byteSize: png.byteLength
    });
    assert.equal(started.session.status, "pending");
    assert.equal(started.upload.method, "proxy");

    const received = await uploads.receiveContent({
      uploadId: started.session.id,
      ownerUserId: "owner",
      body: Readable.from([png])
    });
    assert.equal(received.status, "content_received");

    const asset = await uploads.completeUpload({
      uploadId: started.session.id,
      ownerUserId: "owner"
    });
    assert.equal(asset.status, "ready");
    assert.equal(asset.visibility, "private");
    assert.equal(asset.byteSize, png.byteLength);
    assert.equal(asset.width, 640);
    assert.equal(asset.height, 480);
    assert.equal((await assets.getAsset(asset.id))?.storageKey, started.session.storageKey);
    assert.equal(
      (await assets.getAssetByStorage("local-disk", started.session.storageKey))?.id,
      asset.id
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("MediaUploadsService accepts and completes empty text files", async () => {
  const root = await mkdtemp(join(tmpdir(), "trinacria-media-empty-upload-"));
  try {
    const db = createFakeDbAdapter();
    const providers = new MediaProviderRegistry();
    providers.register(new LocalDiskMediaStorageProvider({ rootDirectory: root }));
    const assets = new MediaAssetsService(new MediaAssetsRepository(db));
    const uploads = new MediaUploadsService(new MediaUploadsRepository(db), assets, providers);

    const started = await uploads.startUpload({
      ownerUserId: "owner",
      filename: "empty.txt",
      mimeType: "text/plain",
      byteSize: 0
    });
    assert.equal(started.session.expectedByteSize, 0);

    await uploads.receiveContent({
      uploadId: started.session.id,
      ownerUserId: "owner",
      body: Readable.from([Buffer.alloc(0)])
    });
    const asset = await uploads.completeUpload({
      uploadId: started.session.id,
      ownerUserId: "owner"
    });

    assert.equal(asset.byteSize, 0);
    assert.equal(asset.mimeType, "text/plain");
    await stat(join(root, asset.storageKey));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("MediaUploadsService replaces content without changing asset identity or access", async () => {
  const root = await mkdtemp(join(tmpdir(), "trinacria-media-replace-"));
  try {
    const db = createFakeDbAdapter();
    const providers = new MediaProviderRegistry();
    providers.register(new LocalDiskMediaStorageProvider({ rootDirectory: root }));
    const assets = new MediaAssetsService(new MediaAssetsRepository(db));
    const uploads = new MediaUploadsService(new MediaUploadsRepository(db), assets, providers);

    const originalUpload = await uploads.startUpload({
      ownerUserId: "owner",
      filename: "notes.txt",
      displayName: "Note condivise",
      mimeType: "text/plain",
      byteSize: 5
    });
    await uploads.receiveContent({
      uploadId: originalUpload.session.id,
      ownerUserId: "owner",
      body: Readable.from([Buffer.from("hello")])
    });
    const original = await uploads.completeUpload({
      uploadId: originalUpload.session.id,
      ownerUserId: "owner"
    });
    await assets.updateAssetVisibility(original.id, "public");

    const replacementUpload = await uploads.startUpload({
      ownerUserId: "owner",
      replacementAssetId: original.id,
      filename: original.originalFilename,
      mimeType: "text/plain",
      byteSize: 7
    });
    await uploads.receiveContent({
      uploadId: replacementUpload.session.id,
      ownerUserId: "owner",
      body: Readable.from([Buffer.from("updated")])
    });
    const replaced = await uploads.completeUpload({
      uploadId: replacementUpload.session.id,
      ownerUserId: "owner"
    });

    assert.equal(replaced.id, original.id);
    assert.equal(replaced.displayName, "Note condivise");
    assert.equal(replaced.visibility, "public");
    assert.equal(replaced.byteSize, 7);
    assert.equal(replaced.storageKey, replacementUpload.session.storageKey);
    await assert.rejects(stat(join(root, original.storageKey)));
    await stat(join(root, replacementUpload.session.storageKey));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("direct S3-compatible completion validates checksum and emits the ready event", async () => {
  const db = createFakeDbAdapter();
  const providers = new MediaProviderRegistry();
  const checksum = "c".repeat(64);
  const png = createPngHeader(320, 200);
  providers.register({
    id: "s3-compatible",
    kind: "s3-compatible",
    async health() {
      return { status: "ok" as const };
    },
    async createUpload() {
      return {
        method: "presigned" as const,
        uploadUrl: "https://storage.example/upload",
        expiresAt: "2026-07-16T12:00:00.000Z",
        requiredHeaders: { "x-amz-checksum-sha256": "test" }
      };
    },
    async writeUpload() {},
    async discardUpload() {},
    async completeUpload(input) {
      assert.equal(input.checksumSha256, checksum);
      return {
        storageKey: input.storageKey,
        byteSize: png.byteLength,
        contentPrefix: png,
        checksum: { algorithm: "sha256" as const, value: checksum }
      };
    },
    async createReadUrl() {
      return { url: "https://storage.example/read", expiresAt: "2026-07-16T12:00:00.000Z" };
    },
    async deleteObject() {}
  });
  const events: string[] = [];
  const domainEvents = new MediaDomainEventsService();
  domainEvents.setPublisher({
    async emit(eventName) {
      events.push(eventName);
    }
  });
  const assets = new MediaAssetsService(new MediaAssetsRepository(db), undefined, domainEvents);
  const config = {
    async resolveDefaultProvider() {
      return providers.get("s3-compatible");
    },
    async getUploadPolicy() {
      return {
        maxFileBytes: 25_000_000,
        maxImagePixels: 40_000_000,
        allowedMimeTypes: ["image/png"]
      };
    }
  } as unknown as MediaStorageConfigService;
  const uploads = new MediaUploadsService(
    new MediaUploadsRepository(db),
    assets,
    providers,
    config,
    domainEvents
  );

  const started = await uploads.startUpload({
    ownerUserId: "owner",
    filename: "launch.png",
    mimeType: "image/png",
    byteSize: png.byteLength,
    checksumSha256: checksum
  });
  assert.equal(started.upload.method, "presigned");
  const asset = await uploads.completeUpload({
    uploadId: started.session.id,
    ownerUserId: "owner"
  });
  assert.equal(asset.status, "ready");
  assert.equal(asset.width, 320);
  assert.equal(asset.height, 200);
  assert.deepEqual(events, ["asset-ready"]);
});

test("MediaUploadsService enforces image pixel limits and purges retained records", async () => {
  const root = await mkdtemp(join(tmpdir(), "trinacria-media-retention-"));
  try {
    const db = createFakeDbAdapter();
    const providers = new MediaProviderRegistry();
    const provider = new LocalDiskMediaStorageProvider({ rootDirectory: root });
    providers.register(provider);
    const assetRepository = new MediaAssetsRepository(db);
    const assets = new MediaAssetsService(assetRepository);
    const uploadRepository = new MediaUploadsRepository(db);
    const config = {
      async resolveDefaultProvider() {
        return provider;
      },
      async getUploadPolicy() {
        return {
          maxFileBytes: 25_000_000,
          maxImagePixels: 100,
          allowedMimeTypes: ["image/png", "text/plain"]
        };
      },
      async getDeletedAssetRetentionDays() {
        return 30;
      }
    } as unknown as MediaStorageConfigService;
    const uploads = new MediaUploadsService(uploadRepository, assets, providers, config);
    const oversizedPng = createPngHeader(20, 20);
    const oversized = await uploads.startUpload({
      ownerUserId: "owner",
      filename: "oversized.png",
      mimeType: "image/png",
      byteSize: oversizedPng.byteLength
    });
    await uploads.receiveContent({
      uploadId: oversized.session.id,
      ownerUserId: "owner",
      body: Readable.from([oversizedPng])
    });
    await assert.rejects(
      uploads.completeUpload({ uploadId: oversized.session.id, ownerUserId: "owner" }),
      (error: unknown) =>
        error instanceof Error && "code" in error && error.code === "media_image_too_large"
    );

    const text = Buffer.from("retained");
    const started = await uploads.startUpload({
      ownerUserId: "owner",
      filename: "retained.txt",
      mimeType: "text/plain",
      byteSize: text.byteLength
    });
    await uploads.receiveContent({
      uploadId: started.session.id,
      ownerUserId: "owner",
      body: Readable.from([text])
    });
    const asset = await uploads.completeUpload({
      uploadId: started.session.id,
      ownerUserId: "owner"
    });
    await assets.deleteAsset(asset.id);

    await uploads.cleanupExpired(Date.now() + 31 * 24 * 60 * 60_000);
    assert.equal(await assets.getAsset(asset.id), null);
    assert.equal(await uploadRepository.findById(started.session.id), null);
    await assert.rejects(stat(join(root, asset.storageKey)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function createProvider(id: string): MediaStorageProvider {
  return {
    id,
    kind: "local-disk",
    async health() {
      return { status: "ok" };
    },
    async createUpload() {
      return {
        method: "proxy",
        uploadUrl: "/v1/media/uploads/test",
        expiresAt: "2026-07-16T12:00:00.000Z"
      };
    },
    async writeUpload() {},
    async discardUpload() {},
    async completeUpload() {
      return { storageKey: "test", byteSize: 1 };
    },
    async createReadUrl() {
      return { url: "/v1/media/assets/test/access", expiresAt: "2026-07-16T12:00:00.000Z" };
    },
    async deleteObject() {}
  };
}

function createPngHeader(width: number, height: number): Uint8Array {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  Buffer.from("IHDR").copy(bytes, 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function createFakeDbAdapter(): DbAdapter {
  const records = new Map<string, Record<string, unknown>[]>();
  const getRecords = (context: NamespaceContext, entityName: string) => {
    const key = `${context.pluginId}:${entityName}`;
    const current = records.get(key);
    if (current) return current;
    const created: Record<string, unknown>[] = [];
    records.set(key, created);
    return created;
  };
  const matches = (value: Record<string, unknown>, filter?: Record<string, unknown>) =>
    !filter ||
    Object.entries(filter).every(([key, expected]) => {
      if (expected && typeof expected === "object") {
        if ("$exists" in expected) {
          return (
            Object.prototype.hasOwnProperty.call(value, key) ===
            Boolean((expected as { $exists: unknown }).$exists)
          );
        }
        if ("$in" in expected) {
          return (expected as { $in: unknown[] }).$in.includes(value[key]);
        }
        if ("$lte" in expected) {
          return (
            typeof value[key] === "string" && value[key] <= (expected as { $lte: string }).$lte
          );
        }
      }
      return value[key] === expected;
    });
  const parse = <TData>(value: Record<string, unknown>, query: DbQuery<TData>): TData =>
    query.parse ? query.parse(value) : (value as TData);

  return {
    repository<TData>(entityName: string, context: NamespaceContext): DbRepository<TData> {
      const collection = getRecords(context, entityName);
      return {
        async findOne(query) {
          const record = collection.find((value) => matches(value, query.filter));
          return record ? parse(record, query) : null;
        },
        async findMany(query) {
          return collection
            .filter((value) => matches(value, query.filter))
            .slice(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? collection.length))
            .map((value) => parse(value, query));
        },
        async insertOne(data) {
          const record = { ...data } as Record<string, unknown>;
          collection.push(record);
          return record as TData;
        },
        async updateOne(query, patch) {
          const record = collection.find((value) => matches(value, query.filter));
          if (!record) return null;
          for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
            if (value === undefined) delete record[key];
            else record[key] = value;
          }
          return record as TData;
        },
        async deleteOne(query) {
          const index = collection.findIndex((value) => matches(value, query.filter));
          if (index < 0) return false;
          collection.splice(index, 1);
          return true;
        }
      };
    },
    async beginTransaction(): Promise<DbTransaction> {
      return { async commit() {}, async rollback() {} };
    },
    async healthCheck() {
      return { ok: true };
    }
  };
}
