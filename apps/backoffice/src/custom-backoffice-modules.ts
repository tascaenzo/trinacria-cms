import { definePluginBackofficeModule, type BackofficeModule } from "@trinacria-cms/admin-kernel";
import { CORE_PACK_ADMIN_MANIFEST } from "@trinacria-cms/core-pack/admin-manifest";
import { EMAIL_PACK_ADMIN_MANIFEST } from "@trinacria-cms/email-pack/admin-manifest";
import { EMAIL_PACK_ADMIN_RENDERERS } from "@trinacria-cms/email-pack/admin";

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
 *   // Escape hatch for custom React pages/widgets/settings owned by the plugin.
 *   // Prefer manifest blocks when possible and colocate custom renderers in the
 *   // plugin package that declares the matching componentRef.
 *   contributions: [...]
 *   renderers: {...}
 * }
 */
export const backofficeModules: readonly BackofficeModule[] = [
  definePluginBackofficeModule({
    pluginId: "core-pack",
    displayName: "Core Pack",
    displayNameKey: "official.plugin.core_pack.display_name",
    admin: CORE_PACK_ADMIN_MANIFEST
  }),
  {
    ...definePluginBackofficeModule({
      pluginId: "email-pack",
      displayName: "Email Pack",
      admin: EMAIL_PACK_ADMIN_MANIFEST
    }),
    renderers: EMAIL_PACK_ADMIN_RENDERERS
  }
];
