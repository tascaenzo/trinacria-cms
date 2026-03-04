import type { PluginManifest } from "@trinacria-cms/kernel/contracts";
import { CORE_PACK_PLUGIN_ID } from "./core-pack.constants.js";
import {
  CORE_PACK_ADMIN_ROLE,
  CORE_PACK_CAPABILITY_LIST,
  CORE_PACK_PERMISSION_DEFINITIONS,
  CORE_PACK_PERMISSION_KEY_LIST,
} from "./core-pack.security.js";

/**
 * Official baseline plugin manifest for Trinacria CMS core-pack.
 */
export const CORE_PACK_MANIFEST: PluginManifest = {
  id: CORE_PACK_PLUGIN_ID,
  version: "0.1.0",
  requiresCore: "^0.1.0",
  capabilities: [...CORE_PACK_CAPABILITY_LIST],
  security: {
    permissions: [...CORE_PACK_PERMISSION_DEFINITIONS],
    roles: [
      {
        ...CORE_PACK_ADMIN_ROLE,
      },
    ],
    grants: [
      {
        roleCode: CORE_PACK_ADMIN_ROLE.code,
        permissionKeys: [...CORE_PACK_PERMISSION_KEY_LIST],
      },
    ],
  },
};
