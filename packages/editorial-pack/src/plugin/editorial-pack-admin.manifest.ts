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
      id: "editorial-entries",
      path: "/editorial/entries",
      label: "Content",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
      order: 80
    }),
    defineAdminRoute({
      id: "editorial-content-types",
      path: "/editorial/content-types",
      label: "Content models",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.CONTENT_TYPES_READ,
      order: 81
    }),
    defineAdminRoute({
      id: "editorial-taxonomies",
      path: "/editorial/taxonomies",
      label: "Taxonomies",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
      order: 82
    })
  ],
  navigation: [
    defineAdminNavigation({
      id: "nav-editorial-entries",
      path: "/editorial/entries",
      label: "Content",
      group: "Editoriale",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
      order: 80
    }),
    defineAdminNavigation({
      id: "nav-editorial-content-types",
      path: "/editorial/content-types",
      label: "Content models",
      group: "Editoriale",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.CONTENT_TYPES_READ,
      order: 81
    }),
    defineAdminNavigation({
      id: "nav-editorial-taxonomies",
      path: "/editorial/taxonomies",
      label: "Taxonomies",
      group: "Editoriale",
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
      order: 82
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
      requiredPermission: EDITORIAL_PACK_PERMISSION_KEYS.ENTRIES_READ,
      layout: {
        defaultColumnSpan: 2,
        defaultRowSpan: 1,
        minColumnSpan: 1,
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
