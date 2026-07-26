import type { PluginManifest } from "@trinacria-cms/kernel";
import {
  defineEmittedEvent,
  defineEvents,
  defineGrant,
  definePluginManifest,
  defineSecurity
} from "@trinacria-cms/kernel/plugin-api";
import { MEDIA_PACK_SETTING_DEFINITIONS } from "../modules/media/media-settings.js";
import { MEDIA_PACK_PLUGIN_ID } from "./media-pack.constants.js";
import {
  MEDIA_PACK_CAPABILITY_LIST,
  MEDIA_PACK_PERMISSION_DEFINITIONS,
  MEDIA_PACK_PERMISSION_KEY_LIST,
  MEDIA_PACK_PERMISSION_KEYS
} from "./media-pack.security.js";
import { MEDIA_PACK_ADMIN_MANIFEST } from "./media-pack-admin.manifest.js";

export const MEDIA_PACK_MANIFEST: PluginManifest = definePluginManifest({
  id: MEDIA_PACK_PLUGIN_ID,
  displayName: "Media Pack",
  description: "Provider-agnostic asset, directory and media access-control plugin.",
  version: "0.1.0",
  requiresCore: "^0.1.0",
  capabilities: [...MEDIA_PACK_CAPABILITY_LIST],
  dependencies: [{ pluginId: "core-pack", versionRange: "^0.1.0" }],
  entities: [
    { name: "assets", schemaVersion: 1 },
    { name: "directories", schemaVersion: 1 },
    { name: "acl_entries", schemaVersion: 1 },
    { name: "uploads", schemaVersion: 1 }
  ],
  settings: [...MEDIA_PACK_SETTING_DEFINITIONS],
  admin: MEDIA_PACK_ADMIN_MANIFEST,
  events: defineEvents({
    emits: [
      defineEmittedEvent({
        name: "asset-ready",
        visibility: "protected",
        version: 1,
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["assetId", "mimeType", "visibility"],
          additionalProperties: false,
          properties: {
            assetId: { type: "string" },
            mimeType: { type: "string" },
            visibility: { enum: ["private", "restricted", "public"] }
          }
        }
      }),
      defineEmittedEvent({
        name: "asset-deleted",
        visibility: "protected",
        version: 1,
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["assetId", "deletedAt"],
          additionalProperties: false,
          properties: {
            assetId: { type: "string" },
            deletedAt: { type: "string" }
          }
        }
      }),
      defineEmittedEvent({
        name: "asset-access-changed",
        visibility: "protected",
        version: 1,
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["assetId", "visibility", "aclVersion"],
          additionalProperties: false,
          properties: {
            assetId: { type: "string" },
            visibility: { enum: ["private", "restricted", "public"] },
            aclVersion: { type: "number" }
          }
        }
      })
    ]
  }),
  security: defineSecurity({
    permissions: [...MEDIA_PACK_PERMISSION_DEFINITIONS],
    grants: [
      defineGrant({
        roleCode: "editor",
        permissionKeys: [
          MEDIA_PACK_PERMISSION_KEYS.ASSETS_READ,
          MEDIA_PACK_PERMISSION_KEYS.ASSETS_UPLOAD,
          MEDIA_PACK_PERMISSION_KEYS.ASSETS_UPDATE
        ]
      }),
      defineGrant({ roleCode: "admin", permissionKeys: [...MEDIA_PACK_PERMISSION_KEY_LIST] })
    ]
  })
});
