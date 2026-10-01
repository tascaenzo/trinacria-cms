import { type BackofficeModule, definePluginBackofficeModule } from "@trinacria-cms/admin-kernel";
import { CORE_PACK_ADMIN_MANIFEST } from "@trinacria-cms/core-pack/admin-manifest";
import { EDITORIAL_PACK_ADMIN_MANIFEST } from "@trinacria-cms/editorial-pack/admin-manifest";
import { EMAIL_PACK_ADMIN_MANIFEST } from "@trinacria-cms/email-pack/admin-manifest";
import { MEDIA_PACK_ADMIN_MANIFEST } from "@trinacria-cms/media-pack/admin-manifest";
import { lazyPluginRenderers } from "./lazy-plugin-renderers.js";

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
      pluginId: "editorial-pack",
      displayName: "Editorial Pack",
      admin: EDITORIAL_PACK_ADMIN_MANIFEST
    }),
    renderers: lazyPluginRenderers(
      () =>
        import("@trinacria-cms/editorial-pack/admin").then(
          (module) => module.EDITORIAL_PACK_ADMIN_RENDERERS
        ),
      {
        pages: [
          "editorial-pack:overview",
          "editorial-pack:entry-detail",
          "editorial-pack:content-type-detail",
          "editorial-pack:content-types",
          "editorial-pack:content-type-create",
          "editorial-pack:entries"
        ],
        dashboardWidgets: ["editorial-pack:work-queue"]
      }
    ),
    dynamicNavigation: {
      load: async ({ cms }) =>
        (await import("@trinacria-cms/editorial-pack/admin")).loadEditorialContentNavigation(cms),
      refreshEvent: "trinacria-cms:editorial-navigation-updated"
    }
  },
  {
    ...definePluginBackofficeModule({
      pluginId: "email-pack",
      displayName: "Email Pack",
      admin: EMAIL_PACK_ADMIN_MANIFEST
    }),
    renderers: lazyPluginRenderers(
      () =>
        import("@trinacria-cms/email-pack/admin").then(
          (module) => module.EMAIL_PACK_ADMIN_RENDERERS
        ),
      { settingsSections: ["email-pack:email-template-manager"] }
    )
  },
  {
    ...definePluginBackofficeModule({
      pluginId: "media-pack",
      displayName: "Media",
      admin: MEDIA_PACK_ADMIN_MANIFEST
    }),
    renderers: lazyPluginRenderers(
      () =>
        import("@trinacria-cms/media-pack/admin").then(
          (module) => module.MEDIA_PACK_ADMIN_RENDERERS
        ),
      {
        pages: ["media-pack:file-manager"],
        settingsSections: ["media-pack:storage-settings", "media-pack:upload-policy-settings"]
      }
    )
  }
];
