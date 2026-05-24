import type { PluginManifest } from "@trinacria-cms/kernel/contracts";
import { CORE_PACK_PLUGIN_ID } from "./core-pack.constants.js";
import {
  CORE_PACK_ADMIN_ROLE,
  CORE_PACK_CAPABILITY_LIST,
  CORE_PACK_PERMISSION_DEFINITIONS,
  CORE_PACK_PERMISSION_KEY_LIST
} from "./core-pack.security.js";
import { CORE_PACK_SETTING_DEFINITION_SEEDS } from "../modules/settings/settings.bootstrap.js";

/**
 * Official baseline plugin manifest for Trinacria CMS core-pack.
 */
export const CORE_PACK_MANIFEST: PluginManifest = {
  id: CORE_PACK_PLUGIN_ID,
  displayName: "Core Pack",
  description: "Official baseline plugin for Trinacria CMS: auth, users, roles, permissions, settings, API keys, and platform security.",
  version: "0.1.0",
  requiresCore: "^0.1.0",
  capabilities: [...CORE_PACK_CAPABILITY_LIST],
  settings: CORE_PACK_SETTING_DEFINITION_SEEDS.map((item) => {
    const [pluginId, namespace, key] = item.key.split(":");
    if (pluginId !== CORE_PACK_PLUGIN_ID || !namespace || !key) {
      throw new Error(`Invalid core-pack setting key "${item.key}"`);
    }
    const schemaObject =
      item.schema && typeof item.schema === "object" && !Array.isArray(item.schema)
        ? (item.schema as Record<string, unknown>)
        : undefined;
    const schemaType =
      schemaObject && typeof schemaObject.type === "string" ? schemaObject.type : typeof item.defaultValue;
    const type =
      schemaType === "string" || schemaType === "number" || schemaType === "boolean"
        ? schemaType
        : "json";
    return {
      namespace,
      key,
      type,
      visibility: "protected" as const,
      required: false,
      description: item.description,
      schema: schemaObject,
      defaultValueJson: JSON.stringify(item.defaultValue)
    };
  }),
  security: {
    permissions: [...CORE_PACK_PERMISSION_DEFINITIONS],
    roles: [
      {
        ...CORE_PACK_ADMIN_ROLE
      }
    ],
    grants: [
      {
        roleCode: CORE_PACK_ADMIN_ROLE.code,
        permissionKeys: [...CORE_PACK_PERMISSION_KEY_LIST]
      }
    ]
  }
};
