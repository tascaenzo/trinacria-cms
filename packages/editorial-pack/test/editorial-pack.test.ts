import assert from "node:assert/strict";
import test from "node:test";
import { validatePluginManifest } from "@trinacria-cms/kernel";
import {
  EDITORIAL_PACK_MANIFEST,
  EDITORIAL_PACK_PERMISSION_KEY_LIST,
  EDITORIAL_PACK_SETTING_DEFINITIONS,
  ContentTypeValidationError,
  ContentTypesService,
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
    [
      "content_types",
      "entries",
      "entry_revisions",
      "review_assignments",
      "editorial_comments",
      "taxonomies",
      "taxonomy_terms",
      "entry_taxonomy_terms",
      "entry_relations"
    ]
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
