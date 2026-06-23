import type { PluginManifest } from "@trinacria-cms/kernel/contracts";
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
export const CORE_PACK_MANIFEST: PluginManifest = {
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
    secret: false,
    mutable: true,
    visibility: "admin" as const
  })),
  admin: CORE_PACK_ADMIN_MANIFEST,
  security: {
    permissions: [...CORE_PACK_PERMISSION_DEFINITIONS],
    roles: CORE_PACK_DEFAULT_ROLES.map((role) => ({ ...role })),
    grants: [
      {
        roleCode: CORE_PACK_ADMIN_ROLE.code,
        permissionKeys: [...CORE_PACK_PERMISSION_KEY_LIST]
      },
      {
        roleCode: "editor",
        permissionKeys: [...CORE_PACK_READONLY_PERMISSION_KEY_LIST]
      },
      {
        roleCode: "viewer",
        permissionKeys: [...CORE_PACK_READONLY_PERMISSION_KEY_LIST]
      }
    ]
  }
};
