import type { PluginManifest } from "@trinacria-cms/kernel/contracts";
import {
  defineEmittedEvent,
  defineEvents,
  defineGrant,
  definePluginManifest,
  defineSecurity
} from "@trinacria-cms/kernel/plugin-api";
import { CORE_PACK_PLUGIN_ID } from "./core-pack.constants.js";
import {
  CORE_PACK_ADMIN_ROLE,
  CORE_PACK_CAPABILITY_LIST,
  CORE_PACK_DEFAULT_ROLES,
  CORE_PACK_PERMISSION_DEFINITIONS,
  CORE_PACK_PERMISSION_KEY_LIST,
  CORE_PACK_READONLY_PERMISSION_KEY_LIST
} from "./core-pack.security.js";
import { CORE_PACK_ADMIN_MANIFEST } from "./core-pack-admin.manifest.js";
import { CORE_PACK_SETTING_DEFINITION_SEEDS } from "../modules/settings/settings.bootstrap.js";

/**
 * Official baseline plugin manifest for Trinacria CMS core-pack.
 */
export const CORE_PACK_MANIFEST: PluginManifest = definePluginManifest({
  id: CORE_PACK_PLUGIN_ID,
  displayName: "Core Pack",
  description:
    "Official baseline plugin for Trinacria CMS: auth, users, roles, permissions, settings, and platform security.",
  version: "0.1.0",
  requiresCore: "^0.1.0",
  capabilities: [...CORE_PACK_CAPABILITY_LIST],
  settings: CORE_PACK_SETTING_DEFINITION_SEEDS.map((item) => ({
    key: item.key,
    category: item.category,
    description: item.description,
    ...(item.schema !== undefined ? { schema: item.schema } : {}),
    ...(item.defaultValue !== undefined ? { defaultValue: item.defaultValue } : {}),
    status: "active" as const,
    secret: item.secret ?? false,
    mutable: item.mutable ?? true,
    visibility: item.visibility ?? ("admin" as const)
  })),
  events: defineEvents({
    emits: [
      defineEmittedEvent({
        name: "secure-event-payload-ready",
        visibility: "public",
        version: 1,
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["securePayloadId", "payloadType", "schemaVersion"],
          additionalProperties: false,
          properties: {
            securePayloadId: { type: "string" },
            payloadType: { type: "string" },
            schemaVersion: { type: "number" }
          }
        }
      }),
      defineEmittedEvent({
        name: "user-created",
        visibility: "public",
        version: 1,
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["userId", "status", "source"],
          additionalProperties: false,
          properties: {
            userId: { type: "string" },
            status: { type: "string", enum: ["active", "suspended"] },
            source: { type: "string", enum: ["admin", "public-registration", "system"] }
          }
        }
      }),
      defineEmittedEvent({
        name: "user-profile-updated",
        visibility: "public",
        version: 1,
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["userId", "changedFields"],
          additionalProperties: false,
          properties: {
            userId: { type: "string" },
            changedFields: {
              type: "array",
              items: { type: "string", enum: ["firstName", "lastName"] }
            }
          }
        }
      }),
      defineEmittedEvent({
        name: "user-status-changed",
        visibility: "public",
        version: 1,
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["userId", "previousStatus", "status"],
          additionalProperties: false,
          properties: {
            userId: { type: "string" },
            previousStatus: { type: "string", enum: ["active", "suspended"] },
            status: { type: "string", enum: ["active", "suspended"] },
            reason: {
              type: "string",
              enum: ["admin", "email-verification", "invite-accepted", "system"]
            }
          }
        }
      }),
      defineEmittedEvent({
        name: "user-invited",
        visibility: "public",
        version: 1,
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["userId"],
          additionalProperties: false,
          properties: {
            userId: { type: "string" },
            actorUserId: { type: "string" }
          }
        }
      }),
      defineEmittedEvent({
        name: "user-invite-accepted",
        visibility: "public",
        version: 1,
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["userId"],
          additionalProperties: false,
          properties: {
            userId: { type: "string" }
          }
        }
      })
    ]
  }),
  admin: CORE_PACK_ADMIN_MANIFEST,
  security: defineSecurity({
    permissions: [...CORE_PACK_PERMISSION_DEFINITIONS],
    roles: CORE_PACK_DEFAULT_ROLES.map((role) => ({ ...role })),
    grants: [
      defineGrant({
        roleCode: CORE_PACK_ADMIN_ROLE.code,
        permissionKeys: [...CORE_PACK_PERMISSION_KEY_LIST]
      }),
      defineGrant({
        roleCode: "editor",
        permissionKeys: [...CORE_PACK_READONLY_PERMISSION_KEY_LIST]
      }),
      defineGrant({
        roleCode: "viewer",
        permissionKeys: [...CORE_PACK_READONLY_PERMISSION_KEY_LIST]
      })
    ]
  })
});
