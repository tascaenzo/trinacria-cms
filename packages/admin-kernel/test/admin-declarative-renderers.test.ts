import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createDeclarativeActionDraftBody,
  DeclarativeDashboardWidgetPanel,
  DeclarativeSettingsSectionPanel,
  resolveDeclarativeActionPathParams,
  renderDeclarativeAdminPage
} from "../src/declarative/index.js";
import { DeclarativeResourceTable } from "../src/declarative/index.js";
import type { AdminPageRenderContext } from "../src/runtime/admin-route-runtime.js";

const baseContext: AdminPageRenderContext = {
  route: {
    id: "products",
    path: "/products",
    pluginId: "catalog",
    mode: "declarative",
    kind: "resource",
    title: "Products",
    summary: "Product catalog"
  },
  runtimePlugins: [],
  capabilityIndex: new Map(),
  resources: [
    {
      id: "products-resource",
      pluginId: "catalog",
      entityName: "products",
      routeId: "products",
      title: "Products",
      summary: "Product catalog",
      fields: [
        { key: "name", label: "Name", primary: true, table: true, form: true },
        { key: "status", label: "Status", kind: "status", table: true }
      ],
      actions: [
        {
          id: "create",
          intent: "create",
          title: "Create product",
          endpoint: { method: "POST", path: "/admin/products" },
          input: {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" }
              }
            }
          }
        }
      ]
    }
  ],
  settings: [],
  widgets: [],
  locale: "en",
  t: (key, fallback) => fallback ?? key
};

test("renderDeclarativeAdminPage renders a resource table from manifest metadata", () => {
  const markup = renderToStaticMarkup(
    createElement(Fragment, null, renderDeclarativeAdminPage(baseContext))
  );

  assert.doesNotMatch(markup, /Products schema/);
  assert.match(markup, /Products/);
  assert.match(markup, /Name/);
  assert.match(markup, /Status/);
  assert.match(markup, /Sample Name/);
  assert.match(markup, /Filters/);
  assert.match(markup, /Actions/);
  assert.doesNotMatch(markup, /Create product/);
});

test("DeclarativeResourceTable renders array fields as compact tags", () => {
  const markup = renderToStaticMarkup(
    createElement(DeclarativeResourceTable, {
      resource: {
        id: "roles-resource",
        pluginId: "core-pack",
        entityName: "roles",
        title: "Roles",
        fields: [
          { key: "name", label: "Name", primary: true, table: true },
          { key: "permissions", label: "Permissions", kind: "tags", table: true }
        ]
      },
      dataState: {
        status: "success",
        data: {
          data: [
            {
              id: "role-1",
              name: "Admin",
              permissions: [
                "core-pack:users:read",
                "core-pack:users:write",
                "core-pack:roles:read",
                "core-pack:roles:write"
              ]
            }
          ]
        },
        refetch: () => {}
      },
      binding: { valuePath: "data" },
      t: (key, fallback) => fallback ?? key
    })
  );

  assert.match(markup, /core-pack:users:read/);
  assert.match(markup, /core-pack:users:write/);
  assert.match(markup, /core-pack:roles:read/);
  assert.match(markup, /\+1/);
  assert.match(markup, /Show all tags/);
  assert.doesNotMatch(markup, /\[&quot;core-pack:users:read/);
});

test("DeclarativeSettingsSectionPanel renders readonly fields inferred from JSON schema", () => {
  const markup = renderToStaticMarkup(
    createElement(DeclarativeSettingsSectionPanel, {
      section: {
        id: "seo",
        pluginId: "seo-pack",
        mode: "declarative",
        kind: "form",
        title: "SEO",
        summary: "Search settings",
        data: {
          endpoint: { method: "GET", path: "/admin/seo/settings" },
          schema: {
            type: "object",
            properties: {
              titleTemplate: { type: "string", title: "Title template" },
              noindex: { type: "boolean", title: "No index" }
            }
          }
        }
      }
    })
  );

  assert.match(markup, /SEO/);
  assert.match(markup, /Title template/);
  assert.match(markup, /No index/);
  assert.match(markup, /GET \/admin\/seo\/settings/);
});

test("DeclarativeDashboardWidgetPanel renders metric widgets from data binding", () => {
  const markup = renderToStaticMarkup(
    createElement(DeclarativeDashboardWidgetPanel, {
      widget: {
        id: "orders-today",
        pluginId: "orders",
        mode: "declarative",
        kind: "metric",
        title: "Orders today",
        summary: "Daily order count",
        data: { endpoint: { path: "/admin/orders/metrics" }, valuePath: "data.today" }
      }
    })
  );

  assert.match(markup, /Orders today/);
  assert.match(markup, /data.today/);
  assert.match(markup, /Daily order count/);
});

test("createDeclarativeActionDraftBody creates JSON samples from schema or record value path", () => {
  const fromSchema = createDeclarativeActionDraftBody({
    endpoint: { method: "POST", path: "/items" },
    input: {
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          enabled: { type: "boolean" }
        }
      }
    }
  });
  const fromRecord = createDeclarativeActionDraftBody(
    {
      endpoint: { method: "PATCH", path: "/items/:id" },
      input: { valuePath: "payload" }
    },
    { record: { payload: { name: "Current" } } }
  );

  assert.deepEqual(JSON.parse(fromSchema), { name: "", enabled: false });
  assert.deepEqual(JSON.parse(fromRecord), { name: "Current" });
});

test("resolveDeclarativeActionPathParams reads params from body before record", () => {
  assert.deepEqual(
    resolveDeclarativeActionPathParams(
      "/items/:id/translations/:locale",
      { locale: "it" },
      { id: "item_1", locale: "en" }
    ),
    { id: "item_1", locale: "it" }
  );
});
