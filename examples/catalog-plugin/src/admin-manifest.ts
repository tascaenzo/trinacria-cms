import type { PluginManifest } from "@trinacria-cms/kernel/contracts";

/** Pure metadata: importing this entry point never loads the backend. */
export const CATALOG_ADMIN_MANIFEST = {
  navigation: [
    {
      id: "catalog",
      label: "Catalog",
      path: "/catalog",
      requiredPermission: "catalog-plugin:items:read"
    }
  ],
  routes: [
    {
      id: "catalog",
      path: "/catalog",
      label: "Catalog",
      requiredPermission: "catalog-plugin:items:read",
      componentRef: "catalog-plugin:catalog"
    }
  ],
  widgets: [
    {
      id: "catalog-count",
      label: "Catalog items",
      componentRef: "catalog-plugin:count",
      requiredPermission: "catalog-plugin:items:read"
    }
  ],
  settingsSections: [
    {
      id: "catalog-settings",
      label: "Catalog",
      category: "catalog",
      namespace: "catalog-plugin",
      kind: "form",
      settingKeys: ["catalog-plugin:catalog:prefix"],
      requiredPermission: "catalog-plugin:items:write"
    }
  ]
} satisfies NonNullable<PluginManifest["admin"]>;
