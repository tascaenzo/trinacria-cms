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
          summary: "Create a catalog product",
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

test("renderDeclarativeAdminPage renders a resource schema table from manifest metadata", () => {
  const markup = renderToStaticMarkup(
    createElement(Fragment, null, renderDeclarativeAdminPage(baseContext))
  );

  assert.match(markup, /Products schema/);
  assert.match(markup, /Name/);
  assert.match(markup, /Status/);
  assert.match(markup, /Sample Name/);
  assert.match(markup, /Create product/);
  assert.match(markup, /Prepare/);
  assert.match(markup, /POST \/admin\/products/);
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
