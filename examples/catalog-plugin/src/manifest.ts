import { definePluginManifest } from "@trinacria-cms/kernel/plugin-api";
import { CATALOG_ADMIN_MANIFEST } from "./admin-manifest.js";
import { ITEM } from "./contracts.js";
export const CATALOG_MANIFEST = definePluginManifest({
  id: "catalog-plugin",
  displayName: "Catalog",
  version: "0.1.0",
  requiresCore: "^0.1.0",
  dependencies: [{ pluginId: "core-pack", versionRange: "^0.1.0" }],
  entities: [
    {
      name: "items",
      schemaVersion: 1,
      documentSchema: ITEM.toOpenApi(),
      indexes: [{ name: "catalog_item_id", fields: { id: 1 }, unique: true }]
    }
  ],
  settings: [
    {
      key: "catalog-plugin:catalog:prefix",
      category: "catalog",
      schema: { type: "string", maxLength: 40 },
      defaultValue: "",
      visibility: "admin",
      mutable: true
    }
  ],
  security: {
    permissions: [
      { key: "catalog-plugin:items:read", displayName: "Read catalog" },
      { key: "catalog-plugin:items:write", displayName: "Write catalog" }
    ],
    grants: [
      {
        roleCode: "admin",
        permissionKeys: ["catalog-plugin:items:read", "catalog-plugin:items:write"]
      }
    ]
  },
  events: {
    emits: [
      {
        name: "item-created",
        version: 1,
        visibility: "protected",
        delivery: "async",
        payloadSchema: {
          type: "object",
          required: ["id", "version"],
          additionalProperties: false,
          properties: { id: { type: "string" }, version: { type: "integer", minimum: 1 } }
        }
      }
    ]
  },
  admin: CATALOG_ADMIN_MANIFEST
});
