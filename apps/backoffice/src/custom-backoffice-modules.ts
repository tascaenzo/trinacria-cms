import {
  definePluginBackofficeModule,
  type BackofficeModule
} from "@trinacria-cms/admin-kernel";
import { CORE_PACK_ADMIN_MANIFEST } from "@trinacria-cms/core-pack/admin-manifest";

/**
 * Monorepo-local extension point for plugin admin modules. Custom plugins can
 * export their backoffice module definitions here without touching shell code.
 *
 * Preferred shape:
 *
 * {
 *   id: "catalog-pack",
 *   manifests: [
 *     {
 *       pluginId: "catalog-pack",
 *       displayName: "Catalog",
 *       admin: {
 *         navigation: [...],
 *         pages: [...],
 *         dashboard: { widgets: [...] },
 *         settings: { sections: [...] },
 *         resources: [...]
 *       }
 *     }
 *   ],
 *   // Escape hatch for custom React pages/widgets/settings when JSON blocks are
 *   // not expressive enough. Prefer manifest blocks when possible.
 *   contributions: [...]
 * }
 */
export const backofficeModules: readonly BackofficeModule[] = [
  definePluginBackofficeModule({
    pluginId: "core-pack",
    displayName: "Core Pack",
    displayNameKey: "official.plugin.core_pack.display_name",
    admin: CORE_PACK_ADMIN_MANIFEST
  })
];
