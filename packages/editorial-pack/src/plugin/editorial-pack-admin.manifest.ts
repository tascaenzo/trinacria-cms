import type { PluginManifestAdmin } from "@trinacria-cms/kernel/contracts";
import {
  defineAdmin,
  defineAdminNavigation,
  defineAdminResource,
  defineAdminRoute,
  defineAdminSettingsSection,
  defineAdminWidget
} from "@trinacria-cms/kernel/plugin-api";
import { EDITORIAL_PACK_PERMISSION_KEYS } from "./editorial-pack.security.js";

export const EDITORIAL_PACK_ADMIN_MANIFEST: PluginManifestAdmin = defineAdmin({
  routes: [
    defineAdminRoute({
      id: "editorial-overview",
      path: "/editorial",
      label: "Overview",
      componentRef: "editorial-pack:overview",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
      order: 79
    }),
    // This shared renderer is intentionally not a static destination: each active
    // content model contributes its own menu item through dynamic navigation.
    defineAdminRoute({
      id: "editorial-entries",
      path: "/editorial/entries",
      label: "Content model entries",
      componentRef: "editorial-pack:entries",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
      order: 80
    }),
    defineAdminRoute({
      id: "editorial-content-types",
      path: "/editorial/content-types",
      label: "Content models",
      componentRef: "editorial-pack:content-types",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.CONTENT_TYPES_READ,
      order: 81
    }),
    defineAdminRoute({
      id: "editorial-content-type",
      path: "/editorial/content-types/detail",
      label: "Content model",
      componentRef: "editorial-pack:content-type-detail",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.CONTENT_TYPES_READ,
      order: 82
    }),
    defineAdminRoute({
      id: "editorial-content-type-create",
      path: "/editorial/content-types/create",
      label: "New content model",
      componentRef: "editorial-pack:content-type-create",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.CONTENT_TYPES_MANAGE,
      order: 83
    }),
    defineAdminRoute({
      id: "editorial-entry-detail",
      path: "/editorial/entries/detail",
      label: "Content editor",
      componentRef: "editorial-pack:entry-detail",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
      order: 84
    })
  ],
  navigation: [
    defineAdminNavigation({
      id: "nav-editorial-overview",
      path: "/editorial",
      label: "Panoramica",
      icon: "layout-dashboard",
      group: "Editoriale",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
      order: 70
    })
  ],
  resources: [
    defineAdminResource({
      id: "entries",
      label: "Content",
      routeBase: "/editorial/entries",
      apiBase: "/v1/editorial/entries",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ
    }),
    defineAdminResource({
      id: "content-types",
      label: "Content models",
      routeBase: "/editorial/content-types",
      apiBase: "/v1/editorial/content-types",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.CONTENT_TYPES_READ
    })
  ],
  widgets: [
    defineAdminWidget({
      id: "editorial-work-queue",
      label: "Editorial work queue",
      componentRef: "editorial-pack:work-queue",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
      layout: {
        defaultColumnSpan: 4,
        defaultRowSpan: 2,
        minColumnSpan: 2,
        maxColumnSpan: 4,
        minRowSpan: 1,
        maxRowSpan: 2
      }
    })
  ],
  settingsSections: [
    defineAdminSettingsSection({
      id: "editorial-pack-workflow-settings",
      label: "Editorial workflow",
      namespace: "workflow",
      category: "workflow",
      settingKeys: [
        "editorial-pack:workflow:default_preset",
        "editorial-pack:workflow:definitions",
        "editorial-pack:workflow:require_reviewer_assignment"
      ],
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.SETTINGS_MANAGE,
      kind: "form",
      summary: "Configure reusable workflows and review requirements.",
      order: 80
    }),
    defineAdminSettingsSection({
      id: "editorial-pack-access-settings",
      label: "Editorial access",
      namespace: "access",
      category: "access",
      settingKeys: ["editorial-pack:access:author_scope"],
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.SETTINGS_MANAGE,
      kind: "form",
      summary: "Set the default ownership policy applied to authors.",
      order: 81
    })
  ]
});
