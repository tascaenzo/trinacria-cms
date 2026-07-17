import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import mongoose from "mongoose";
import { CreateBucketCommand, DeleteBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { EntityRegistry, createMongoDbAdapter } from "@trinacria-cms/kernel";
import {
  MEDIA_ACL_ENTRIES_ENTITY,
  MEDIA_ASSETS_ENTITY,
  MEDIA_DIRECTORIES_ENTITY,
  MEDIA_UPLOADS_ENTITY,
  LocalDiskMediaStorageProvider,
  MediaAssetsRepository,
  MediaAssetsService,
  MediaDirectoriesRepository,
  MediaDirectoriesService,
  MediaProviderRegistry,
  MediaUploadsRepository,
  MediaUploadsService,
  S3MediaStorageProvider
} from "../src/index.js";

const RUN_MONGO = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
const RUN_S3 = process.env.TRINACRIA_RUN_S3_INTEGRATION === "1";
const MONGO_URI =
  process.env.TRINACRIA_MONGO_URI ??
  process.env.MONGO_URI ??
  "mongodb://trinacria:trinacria@127.0.0.1:27017/trinacria_cms?authSource=admin";

test(
  "media repositories and upload lifecycle work against real MongoDB",
  { skip: RUN_MONGO ? false : "Set TRINACRIA_RUN_MONGO_INTEGRATION=1" },
  async () => {
    const dbName = `trinacria_media_pack_${Date.now()}`;
    const root = await mkdtemp(join(tmpdir(), "trinacria-media-mongo-"));
    const connection = await mongoose.createConnection(MONGO_URI, { dbName }).asPromise();
    try {
      const registry = new EntityRegistry();
      registry.register(MEDIA_ASSETS_ENTITY);
      registry.register(MEDIA_DIRECTORIES_ENTITY);
      registry.register(MEDIA_ACL_ENTRIES_ENTITY);
      registry.register(MEDIA_UPLOADS_ENTITY);
      const db = createMongoDbAdapter({ connection, entityRegistry: registry });
      await db.ensureIndexes?.("media-pack", ["assets", "directories", "acl_entries", "uploads"]);

      const assetRepository = new MediaAssetsRepository(db);
      const directoryRepository = new MediaDirectoriesRepository(db);
      const assets = new MediaAssetsService(assetRepository, directoryRepository);
      const directories = new MediaDirectoriesService(directoryRepository, assetRepository);
      const providers = new MediaProviderRegistry();
      providers.register(new LocalDiskMediaStorageProvider({ rootDirectory: root }));
      const uploadRepository = new MediaUploadsRepository(db);
      const uploads = new MediaUploadsService(uploadRepository, assets, providers);
      const directory = await directories.createDirectory({
        ownerUserId: "mongo-owner",
        name: "Documents"
      });
      const content = Buffer.from("mongo media integration");
      const started = await uploads.startUpload({
        ownerUserId: "mongo-owner",
        directoryId: directory.id,
        filename: "integration.txt",
        mimeType: "text/plain",
        byteSize: content.byteLength
      });
      await uploads.receiveContent({
        uploadId: started.session.id,
        ownerUserId: "mongo-owner",
        body: Readable.from([content])
      });
      const asset = await uploads.completeUpload({
        uploadId: started.session.id,
        ownerUserId: "mongo-owner"
      });

      assert.equal(asset.directoryId, directory.id);
      assert.equal((await assets.listAssets({ directoryId: directory.id })).length, 1);
      assert.equal((await uploadRepository.findById(started.session.id))?.status, "completed");
      await assert.rejects(directories.deleteDirectory(directory.id), /contains media assets/);
    } finally {
      await connection.dropDatabase();
      await connection.close();
      await rm(root, { recursive: true, force: true });
    }
  }
);

test(
  "S3-compatible provider passes upload, completion, read and delete smoke",
  { skip: RUN_S3 ? false : "Set TRINACRIA_RUN_S3_INTEGRATION=1" },
  async () => {
    const endpoint = process.env.TRINACRIA_S3_ENDPOINT ?? "http://127.0.0.1:9000";
    const accessKeyId = process.env.TRINACRIA_S3_ACCESS_KEY ?? "trinacria";
    const secretAccessKey = process.env.TRINACRIA_S3_SECRET_KEY ?? "trinacria-secret";
    const bucket = process.env.TRINACRIA_S3_BUCKET ?? `trinacria-media-${Date.now()}`;
    const client = new S3Client({
      endpoint,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey }
    });
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    const provider = new S3MediaStorageProvider({
      endpoint,
      region: "us-east-1",
      bucket,
      accessKeyId,
      secretAccessKey,
      forcePathStyle: true
    });
    const content = Buffer.from("s3-compatible media integration");
    const checksumSha256 = createHash("sha256").update(content).digest("hex");
    const uploadId = `integration-${Date.now()}`;
    const storageKey = `assets/${uploadId}`;

    try {
      assert.deepEqual(await provider.health(), { status: "ok" });
      const upload = await provider.createUpload({
        uploadId,
        storageKey,
        contentType: "text/plain",
        expectedByteSize: content.byteLength,
        checksumSha256
      });
      const uploaded = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: upload.requiredHeaders,
        body: content
      });
      assert.equal(uploaded.ok, true, await uploaded.text());

      const stored = await provider.completeUpload({ uploadId, storageKey, checksumSha256 });
      assert.equal(stored.byteSize, content.byteLength);
      assert.equal(stored.checksum?.value, checksumSha256);
      assert.deepEqual(Buffer.from(stored.contentPrefix ?? []), content);

      const read = await provider.createReadUrl({ storageKey, expiresInSeconds: 60 });
      const response = await fetch(read.url);
      assert.equal(response.ok, true);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), content);

      await provider.deleteObject({ storageKey });
      assert.equal((await fetch(read.url)).status, 404);
    } finally {
      await provider.deleteObject({ storageKey }).catch(() => undefined);
      await provider.discardUpload(uploadId).catch(() => undefined);
      await client.send(new DeleteBucketCommand({ Bucket: bucket })).catch(() => undefined);
      client.destroy();
    }
  }
);
