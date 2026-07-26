import assert from "node:assert/strict";
import test from "node:test";
import { validatePluginManifest } from "@trinacria-cms/kernel";
import {
  EDITORIAL_PACK_MANIFEST,
  EDITORIAL_PACK_PERMISSION_KEY_LIST,
  EDITORIAL_PACK_SETTING_DEFINITIONS,
  ContentTypeValidationError,
  ContentTypesService,
  EntriesService,
  EntryValidationError,
  type EntryRecord,
  type ContentTypeRecord
} from "../src/index.js";
import {
  getTransitionToStatus,
  supportsEditorialReview,
  type EditorialEntryContentType
} from "../src/admin/entries/entries.types.js";

test("editorial-pack declares the plugin foundation", () => {
  const manifest = validatePluginManifest(EDITORIAL_PACK_MANIFEST);

  assert.equal(manifest.id, "editorial-pack");
  assert.deepEqual(manifest.dependencies, [
    { pluginId: "core-pack", versionRange: "^0.1.0", optional: false },
    { pluginId: "media-pack", versionRange: "^0.1.0", optional: false }
  ]);
  assert.deepEqual(
    manifest.entities.map((entity) => entity.name),
    ["content_types", "entries", "entry_revisions"]
  );
  assert.deepEqual(
    manifest.settings.map((setting) => setting.key).sort(),
    EDITORIAL_PACK_SETTING_DEFINITIONS.map((setting) => setting.key).sort()
  );
  assert.deepEqual(
    manifest.security?.grants?.find((grant) => grant.roleCode === "admin")?.permissionKeys,
    EDITORIAL_PACK_PERMISSION_KEY_LIST
  );
  assert.deepEqual(
    manifest.security?.roles?.map((role) => role.code),
    ["author", "reviewer", "content-manager"]
  );
});

test("review boards expose only configured workflow transitions", () => {
  const reviewModel = {
    id: "content-type-article",
    key: "article",
    name: "Article",
    status: "active",
    workflowId: "review"
  } satisfies EditorialEntryContentType;
  const directModel = {
    id: "content-type-page",
    key: "page",
    name: "Page",
    status: "active",
    workflowId: "direct"
  } satisfies EditorialEntryContentType;
  const draft = {
    id: "entry-1",
    contentTypeId: reviewModel.id,
    status: "draft",
    updatedAt: "2026-07-26T00:00:00.000Z"
  };

  assert.equal(supportsEditorialReview(reviewModel), true);
  assert.equal(supportsEditorialReview(directModel), false);
  assert.equal(getTransitionToStatus(draft, "in_review", reviewModel)?.id, "submit");
  assert.equal(getTransitionToStatus(draft, "published", reviewModel), null);
});

test("entries are validated against the active content type before persistence", async () => {
  const contentType: ContentTypeRecord = {
    id: "content-type-event",
    key: "event",
    name: "Event",
    status: "active",
    fields: [
      { key: "starts_at", label: "Starts at", type: "date_time", required: true, multiple: false },
      { key: "tickets_url", label: "Tickets", type: "url", required: false, multiple: false }
    ],
    taxonomyIds: [],
    ownershipScope: "inherit",
    createdByUserId: "manager-1",
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z"
  };
  const service = new EntriesService(
    {
      async create(input: {
        contentTypeId: string;
        ownerUserId: string;
        data: Record<string, unknown>;
      }) {
        const now = "2026-07-17T00:00:00.000Z";
        return {
          id: "entry-1",
          contentTypeId: input.contentTypeId,
          ownerUserId: input.ownerUserId,
          data: input.data,
          status: "draft",
          createdAt: now,
          updatedAt: now
        } as EntryRecord;
      },
      async findById() {
        return null;
      },
      async list() {
        return [];
      },
      async update() {
        return null;
      }
    } as never,
    {
      async getContentType(id: string) {
        return id === contentType.id ? contentType : null;
      }
    } as never,
    {
      async create() {
        return {};
      },
      async listByEntryId() {
        return [];
      }
    } as never
  );

  const entry = await service.createEntry(
    {
      contentTypeId: contentType.id,
      data: {
        starts_at: "2026-07-20T18:30:00.000Z",
        tickets_url: "https://example.test/tickets"
      }
    },
    "author-1"
  );

  assert.equal(entry.status, "draft");
  await assert.rejects(
    () =>
      service.createEntry(
        { contentTypeId: contentType.id, data: { tickets_url: "https://example.test/tickets" } },
        "author-1"
      ),
    EntryValidationError
  );
  await assert.rejects(
    () =>
      service.createEntry(
        { contentTypeId: contentType.id, data: { starts_at: "not-a-date" } },
        "author-1"
      ),
    EntryValidationError
  );
  await assert.rejects(
    () =>
      service.createEntry(
        {
          contentTypeId: contentType.id,
          data: { starts_at: "2026-07-20T18:30:00.000Z", unexpected: "value" }
        },
        "author-1"
      ),
    EntryValidationError
  );
});

test("editorial transitions create immutable revision snapshots", async () => {
  const entry: EntryRecord = {
    id: "entry-workflow-1",
    contentTypeId: "content-type-event",
    ownerUserId: "author-1",
    reviewerUserId: "reviewer-1",
    data: {},
    status: "draft",
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z"
  };
  const service = new EntriesService(
    {
      async create() {
        return entry;
      },
      async findById() {
        return entry;
      },
      async list() {
        return [];
      },
      async update() {
        return entry;
      },
      async updateStatus(_id: string, status: EntryRecord["status"]) {
        entry.status = status;
        return entry;
      }
    } as never,
    {
      async getContentType() {
        return {
          id: "content-type-event",
          key: "event",
          name: "Event",
          status: "active",
          fields: [],
          taxonomyIds: [],
          ownershipScope: "inherit",
          createdByUserId: "manager-1",
          createdAt: "2026-07-17T00:00:00.000Z",
          updatedAt: "2026-07-17T00:00:00.000Z"
        } satisfies ContentTypeRecord;
      }
    } as never,
    {
      records: [] as Array<{ reason: string; snapshotJson: string }>,
      async listByEntryId() {
        return this.records;
      },
      async create(revision: { reason: string; snapshotJson: string }) {
        this.records.unshift(revision);
        return revision;
      }
    } as never
  );

  const submitted = await service.transitionEntry(entry.id, "submit", {
    actorUserId: "author-1",
    canAccessAll: false
  });
  assert.equal(submitted?.status, "in_review");
  // The immutable snapshot is stored in the dedicated revisions repository.
  await assert.rejects(
    () =>
      service.transitionEntry(entry.id, "publish", { actorUserId: "editor-1", canAccessAll: true }),
    EntryValidationError
  );
});

test("direct workflows allow a draft to be published without review", async () => {
  const entry: EntryRecord = {
    id: "entry-direct-1",
    contentTypeId: "content-type-page",
    ownerUserId: "author-1",
    data: {},
    status: "draft",
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z"
  };
  const service = new EntriesService(
    {
      async findById() {
        return entry;
      },
      async updateStatus(_id: string, status: EntryRecord["status"]) {
        entry.status = status;
        return entry;
      }
    } as never,
    {
      async getContentType() {
        return {
          id: "content-type-page",
          key: "page",
          name: "Page",
          workflowId: "direct",
          status: "active",
          fields: [],
          taxonomyIds: [],
          ownershipScope: "inherit",
          createdByUserId: "manager-1",
          createdAt: "2026-07-17T00:00:00.000Z",
          updatedAt: "2026-07-17T00:00:00.000Z"
        } satisfies ContentTypeRecord;
      }
    } as never,
    {
      async listByEntryId() {
        return [];
      },
      async create() {
        return {};
      }
    } as never
  );

  const published = await service.transitionEntry(entry.id, "publish", {
    actorUserId: "author-1",
    canAccessAll: false
  });
  assert.equal(published?.status, "published");
});

test("content types keep stable keys and reject unsafe field definitions", async () => {
  const records = new Map<string, ContentTypeRecord>();
  const service = new ContentTypesService({
    async findByKey(key: string) {
      return Array.from(records.values()).find((record) => record.key === key) ?? null;
    },
    async create(input: {
      key: string;
      name: string;
      fields: ContentTypeRecord["fields"];
      createdByUserId: string;
      description?: string;
      icon?: string;
      taxonomyIds?: readonly string[];
      workflowId?: string;
      ownershipScope?: ContentTypeRecord["ownershipScope"];
    }) {
      const now = "2026-07-17T00:00:00.000Z";
      const record: ContentTypeRecord = {
        id: `content-type-${records.size + 1}`,
        key: input.key,
        name: input.name,
        status: "active",
        fields: input.fields,
        taxonomyIds: [...(input.taxonomyIds ?? [])],
        ownershipScope: input.ownershipScope ?? "inherit",
        createdByUserId: input.createdByUserId,
        createdAt: now,
        updatedAt: now
      };
      records.set(record.id, record);
      return record;
    },
    async findById(id: string) {
      return records.get(id) ?? null;
    },
    async list() {
      return Array.from(records.values());
    },
    async update() {
      return null;
    }
  } as never);

  const eventType = await service.createContentType(
    {
      key: "event",
      name: "Event",
      fields: [
        {
          key: "starts_at",
          label: "Starts at",
          type: "date_time",
          required: true,
          multiple: false
        }
      ]
    },
    "user-1"
  );

  assert.equal(eventType.key, "event");
  assert.equal(eventType.ownershipScope, "inherit");
  await assert.rejects(
    () =>
      service.createContentType(
        {
          key: "event",
          name: "Duplicate event",
          fields: []
        },
        "user-1"
      ),
    ContentTypeValidationError
  );
  await assert.rejects(
    () =>
      service.createContentType(
        {
          key: "unsafe",
          name: "Unsafe type",
          fields: [{ key: "title", label: "Title", type: "text", required: false, multiple: false }]
        },
        "user-1"
      ),
    ContentTypeValidationError
  );
  await assert.rejects(
    () =>
      service.createContentType(
        {
          key: "duplicate-fields",
          name: "Duplicate fields",
          fields: [
            { key: "location", label: "Location", type: "text", required: false, multiple: false },
            { key: "location", label: "Venue", type: "text", required: false, multiple: false }
          ]
        },
        "user-1"
      ),
    ContentTypeValidationError
  );
});

test("content types support soft delete, restore and guarded permanent deletion", async () => {
  const now = "2026-07-26T10:00:00.000Z";
  let record: ContentTypeRecord | null = {
    id: "content-type-news",
    key: "news",
    name: "News",
    status: "active",
    fields: [],
    taxonomyIds: [],
    ownershipScope: "inherit",
    createdByUserId: "manager-1",
    createdAt: now,
    updatedAt: now
  };
  const service = new ContentTypesService({
    async findById() {
      return record?.deletedAt ? null : record;
    },
    async list(options?: { deleted?: boolean }) {
      if (!record) return [];
      return Boolean(record.deletedAt) === Boolean(options?.deleted) ? [record] : [];
    },
    async softDelete() {
      if (!record || record.deletedAt) return null;
      record = { ...record, deletedAt: now, updatedAt: now };
      return record;
    },
    async restore() {
      if (!record?.deletedAt) return null;
      const { deletedAt: _deletedAt, ...restored } = record;
      record = restored;
      return record;
    },
    async hardDelete() {
      if (!record?.deletedAt) return false;
      record = null;
      return true;
    }
  } as never);

  assert.equal(await service.permanentlyDeleteContentType("content-type-news"), false);

  const deleted = await service.deleteContentType("content-type-news");
  assert.equal(deleted?.deletedAt, now);
  assert.equal(await service.getContentType("content-type-news"), null);
  assert.deepEqual(await service.listContentTypes(), []);
  assert.deepEqual(await service.listContentTypes({ deleted: true }), [deleted]);

  const restored = await service.restoreContentType("content-type-news");
  assert.equal(restored?.deletedAt, undefined);
  assert.equal((await service.getContentType("content-type-news"))?.name, "News");

  await service.deleteContentType("content-type-news");
  assert.equal(await service.permanentlyDeleteContentType("content-type-news"), true);
  assert.deepEqual(await service.listContentTypes({ deleted: true }), []);
});
