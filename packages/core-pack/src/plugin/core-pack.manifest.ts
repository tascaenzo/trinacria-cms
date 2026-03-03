import type { PluginManifest } from "@trinacria-cms/kernel/contracts";
import { CORE_PACK_PLUGIN_ID } from "./core-pack.constants.js";

/**
 * Official baseline plugin manifest for Trinacria CMS core-pack.
 */
export const CORE_PACK_MANIFEST: PluginManifest = {
  id: CORE_PACK_PLUGIN_ID,
  version: "0.1.0",
  requiresCore: "^0.1.0",
  capabilities: [
    "users.read",
    "users.write",
    "roles.read",
    "roles.write",
    "permissions.read",
    "permissions.write",
    "settings.read",
    "settings.write",
  ],
};
