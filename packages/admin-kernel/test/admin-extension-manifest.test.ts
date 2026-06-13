import assert from "node:assert/strict";
import test from "node:test";
import type { AdminExtensionManifest } from "../src/contracts.js";
import {
  normalizeAdminExtensionManifest,
  normalizeSafeAdminExtensionManifest
} from "../src/runtime/admin-extension-manifest.js";

test("normalizeSafeAdminExtensionManifest flattens plugin admin surfaces", () => {
  const manifest: AdminExtensionManifest = {
    pluginId: "catalog-pack",
    displayName: "Catalog",
    admin: {
      pages: [
        {
          id: "catalog",
          path: "/catalog",
          pluginId: "catalog-pack",
          mode: "declarative",
          kind: "resource",
          title: "Catalog"
        }
      ],
      navigation: [
        {
          id: "nav-catalog",
          routeId: "catalog",
          title: "Catalog"
        }
      ],
      dashboard: {
        widgets: [
          {
            id: "catalog-total",
            pluginId: "catalog-pack",
            mode: "declarative",
            kind: "metric",
            title: "Products",
            data: { endpoint: { path: "/admin/catalog/stats" }, valuePath: "total" }
          }
        ]
      },
      settings: {
        sections: [
          {
            id: "catalog-general",
            pluginId: "catalog-pack",
            mode: "declarative",
            kind: "form",
            title: "Catalog settings"
          }
        ]
      },
      resources: [
        {
          id: "catalog-products",
          pluginId: "catalog-pack",
          entityName: "products",
          title: "Products"
        }
      ]
    }
  };

  const contribution = normalizeSafeAdminExtensionManifest(manifest);

  assert.equal(contribution.pluginId, "catalog-pack");
  assert.equal(contribution.routes.length, 1);
  assert.equal(contribution.routes[0].id, "catalog");
  assert.equal(typeof contribution.routes[0].render, "function");
  assert.equal(contribution.navigation.length, 1);
  assert.equal(contribution.widgets?.[0].kind, "metric");
  assert.equal(contribution.settings?.[0].kind, "form");
  assert.equal(contribution.resources?.[0].entityName, "products");
});

test("normalizeSafeAdminExtensionManifest sanitizes unsafe declarative endpoints", () => {
  const manifest: AdminExtensionManifest = {
    pluginId: "unsafe-pack",
    displayName: "Unsafe",
    admin: {
      pages: [
        {
          id: "unsafe-page",
          path: "/unsafe",
          pluginId: "unsafe-pack",
          mode: "declarative",
          title: "Unsafe",
          data: { endpoint: { path: "https://example.com/steal" }, valuePath: "data" }
        }
      ],
      dashboard: {
        widgets: [
          {
            id: "unsafe-widget",
            pluginId: "unsafe-pack",
            mode: "declarative",
            title: "Unsafe widget",
            data: { endpoint: { path: "/public/stats" }, valuePath: "total" }
          }
        ]
      },
      resources: [
        {
          id: "unsafe-resource",
          pluginId: "unsafe-pack",
          entityName: "unsafe",
          title: "Unsafe",
          actions: [
            {
              id: "unguarded-delete",
              intent: "delete",
              title: "Delete",
              endpoint: { method: "DELETE", path: "/admin/unsafe/:id" }
            },
            {
              id: "external",
              intent: "update",
              title: "External",
              endpoint: { method: "PATCH", path: "//evil.test/admin" },
              guards: [{ capability: "unsafe.write" }]
            },
            {
              id: "safe",
              intent: "update",
              title: "Safe",
              endpoint: { method: "PATCH", path: "/admin/unsafe/:id" },
              guards: [{ capability: "unsafe.write" }]
            }
          ]
        }
      ]
    }
  };

  const contribution = normalizeSafeAdminExtensionManifest(manifest);

  assert.equal(contribution.routes[0].data?.endpoint, undefined);
  assert.equal(contribution.widgets?.[0].data?.endpoint, undefined);
  assert.deepEqual(
    contribution.resources?.[0].actions?.map((action) => action.id),
    ["safe"]
  );
});

test("normalizeAdminExtensionManifest rejects manifests that bypass the safe factory", () => {
  const manifest: AdminExtensionManifest = {
    pluginId: "unsafe-pack",
    displayName: "Unsafe",
    admin: {
      pages: [
        {
          id: "unsafe",
          path: "/unsafe",
          pluginId: "unsafe-pack",
          title: "Unsafe"
        }
      ]
    }
  };

  assert.throws(
    () => normalizeAdminExtensionManifest(manifest as never),
    /Unsafe admin extension manifest/
  );
});
