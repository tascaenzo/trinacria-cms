import type { PluginManifest } from "@trinacria-cms/kernel";
import {
  defineEmittedEvent,
  defineEvents,
  defineGrant,
  definePluginManifest,
  defineSecurity
} from "@trinacria-cms/kernel/plugin-api";
import { EDITORIAL_PACK_SETTING_DEFINITIONS } from "../modules/settings/editorial-pack-settings.js";
import { EDITORIAL_PACK_ADMIN_MANIFEST } from "./editorial-pack-admin.manifest.js";
import { EDITORIAL_PACK_PLUGIN_ID } from "./editorial-pack.constants.js";
import {
  EDITORIAL_PACK_CAPABILITY_LIST,
  EDITORIAL_PACK_CONTENT_MANAGER_ROLE,
  EDITORIAL_PACK_PERMISSION_DEFINITIONS,
  EDITORIAL_PACK_PERMISSION_KEY_LIST,
  EDITORIAL_PACK_PERMISSION_KEYS,
  EDITORIAL_PACK_REVIEWER_ROLE,
  EDITORIAL_PACK_AUTHOR_ROLE
} from "./editorial-pack.security.js";

const entryEventPayloadSchema = {
  type: "object",
  required: ["entryId", "contentTypeId", "actorUserId", "status", "occurredAt"],
  additionalProperties: false,
  properties: {
    entryId: { type: "string" },
    contentTypeId: { type: "string" },
    actorUserId: { type: "string" },
    status: { type: "string" },
    occurredAt: { type: "string" }
  }
} as const;

export const EDITORIAL_PACK_MANIFEST: PluginManifest = definePluginManifest({
  id: EDITORIAL_PACK_PLUGIN_ID,
  displayName: "Editorial Pack",
  description: "Configurable content modelling, editorial workflows, revisions and taxonomies.",
  version: "0.1.0",
  requiresCore: "^0.1.0",
  capabilities: [...EDITORIAL_PACK_CAPABILITY_LIST],
  dependencies: [
    { pluginId: "core-pack", versionRange: "^0.1.0" },
    { pluginId: "media-pack", versionRange: "^0.1.0" }
  ],
  entities: [
    { name: "content_types", schemaVersion: 1 },
    { name: "entries", schemaVersion: 1 },
    { name: "entry_revisions", schemaVersion: 1 },
    { name: "review_assignments", schemaVersion: 1 },
    { name: "editorial_comments", schemaVersion: 1 },
    { name: "taxonomies", schemaVersion: 1 },
    { name: "taxonomy_terms", schemaVersion: 1 },
    { name: "entry_taxonomy_terms", schemaVersion: 1 },
    { name: "entry_relations", schemaVersion: 1 }
  ],
  settings: [...EDITORIAL_PACK_SETTING_DEFINITIONS],
  admin: EDITORIAL_PACK_ADMIN_MANIFEST,
  events: defineEvents({
    emits: [
      defineEmittedEvent({
        name: "entry-created",
        visibility: "protected",
        version: 1,
        delivery: "async",
        payloadSchema: entryEventPayloadSchema
      }),
      defineEmittedEvent({
        name: "entry-transitioned",
        visibility: "protected",
        version: 1,
        delivery: "async",
        payloadSchema: entryEventPayloadSchema
      }),
      defineEmittedEvent({
        name: "entry-published",
        visibility: "protected",
        version: 1,
        delivery: "async",
        payloadSchema: entryEventPayloadSchema
      })
    ]
  }),
  security: defineSecurity({
    permissions: [...EDITORIAL_PACK_PERMISSION_DEFINITIONS],
    roles: [
      EDITORIAL_PACK_AUTHOR_ROLE,
      EDITORIAL_PACK_REVIEWER_ROLE,
      EDITORIAL_PACK_CONTENT_MANAGER_ROLE
    ],
    grants: [
      defineGrant({
        roleCode: "author",
        permissionKeys: [
          EDITORIAL_PACK_PERMISSION_KEYS.CONTENT_TYPES_READ,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_CREATE,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_UPDATE,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_SUBMIT,
          EDITORIAL_PACK_PERMISSION_KEYS.REVISIONS_READ
        ]
      }),
      defineGrant({
        roleCode: "reviewer",
        permissionKeys: [
          EDITORIAL_PACK_PERMISSION_KEYS.CONTENT_TYPES_READ,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_REVIEW,
          EDITORIAL_PACK_PERMISSION_KEYS.REVISIONS_READ
        ]
      }),
      defineGrant({
        roleCode: "editor",
        permissionKeys: [
          EDITORIAL_PACK_PERMISSION_KEYS.CONTENT_TYPES_READ,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_CREATE,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_UPDATE,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_DELETE,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_SUBMIT,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_REVIEW,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_APPROVE,
          EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_PUBLISH,
          EDITORIAL_PACK_PERMISSION_KEYS.REVISIONS_READ,
          EDITORIAL_PACK_PERMISSION_KEYS.REVISIONS_RESTORE,
          EDITORIAL_PACK_PERMISSION_KEYS.TAXONOMIES_MANAGE
        ]
      }),
      defineGrant({
        roleCode: "content-manager",
        permissionKeys: [...EDITORIAL_PACK_PERMISSION_KEY_LIST]
      }),
      defineGrant({ roleCode: "admin", permissionKeys: [...EDITORIAL_PACK_PERMISSION_KEY_LIST] })
    ]
  })
});
