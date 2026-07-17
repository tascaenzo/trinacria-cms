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

test("editorial-pack declares the plugin foundation", () => {
  const manifest = validatePluginManifest(EDITORIAL_PACK_MANIFEST);

  assert.equal(manifest.id, "editorial-pack");
  assert.deepEqual(manifest.dependencies, [
    { pluginId: "core-pack", versionRange: "^0.1.0", optional: false },
    { pluginId: "media-pack", versionRange: "^0.1.0", optional: false }
  ]);
  assert.deepEqual(
    manifest.entities.map((entity) => entity.name),
    ["content_types", "entries"]
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
        throw new Error("Unexpected revision creation");
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
      },
      async appendRevision(updated: EntryRecord, revision: EntryRecord["revisions"] extends readonly (infer T)[] | undefined ? T : never) {
        entry.revisions = [...(updated.revisions ?? []), revision];
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
    } as never
  );

  const submitted = await service.transitionEntry(entry.id, "submit", "author-1");
  assert.equal(submitted?.status, "in_review");
  assert.equal(entry.revisions?.[0]?.reason, "transition:submit");
  assert.equal(JSON.parse(entry.revisions?.[0]?.snapshotJson ?? "{}").status, "in_review");
  await assert.rejects(
    () => service.transitionEntry(entry.id, "publish", "editor-1"),
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
      async findById() { return entry; },
      async updateStatus(_id: string, status: EntryRecord["status"]) { entry.status = status; return entry; },
      async appendRevision(updated: EntryRecord, revision: EntryRecord["revisions"] extends readonly (infer T)[] | undefined ? T : never) { entry.revisions = [...(updated.revisions ?? []), revision]; return entry; }
    } as never,
    {
      async getContentType() {
        return {
          id: "content-type-page", key: "page", name: "Page", workflowId: "direct", status: "active", fields: [], taxonomyIds: [], ownershipScope: "inherit", createdByUserId: "manager-1", createdAt: "2026-07-17T00:00:00.000Z", updatedAt: "2026-07-17T00:00:00.000Z"
        } satisfies ContentTypeRecord;
      }
    } as never,
    { async create() { return {}; } } as never
  );

  const published = await service.transitionEntry(entry.id, "publish", "author-1");
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
