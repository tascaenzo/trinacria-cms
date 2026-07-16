import assert from "node:assert/strict";
import test from "node:test";
import {
  PLUGIN_AUTH_HEADERS,
  buildPluginRequestSignature,
  createSignedPluginRequest,
  definePermissionKey,
  successEnvelope
} from "../src/plugin-api/index.js";
import { CORE_PACK_ADMIN_I18N, CORE_PACK_ADMIN_I18N_SOURCES } from "../src/admin-i18n/index.js";
import { CORE_PACK_MANIFEST } from "../src/plugin/core-pack.manifest.js";

test("core-pack plugin API keeps kernel helper re-exports available for compatibility", () => {
  assert.equal(definePermissionKey("Blog-Pack", "Posts", "Read"), "blog-pack:posts:read");
  assert.deepEqual(successEnvelope({ ok: true }), { data: { ok: true } });
});

test("core-pack plugin API creates signed plugin requests", () => {
  const request = createSignedPluginRequest({
    pluginId: "Blog-Pack",
    secret: "test-secret",
    method: "post",
    path: "/v1/settings/",
    body: { value: true },
    timestamp: 1234,
    nonce: "nonce-1",
    headers: { "content-type": "application/json" }
  });

  assert.equal(request.method, "POST");
  assert.equal(request.path, "/v1/settings");
  assert.equal(request.headers[PLUGIN_AUTH_HEADERS.pluginId], "blog-pack");
  assert.equal(request.headers["content-type"], "application/json");
  assert.equal(
    request.headers[PLUGIN_AUTH_HEADERS.signature],
    buildPluginRequestSignature({
      pluginId: "blog-pack",
      secret: "test-secret",
      method: "POST",
      path: "/v1/settings",
      timestamp: 1234,
      nonce: "nonce-1",
      body: { value: true }
    })
  );
});

test("core-pack exposes plugin management only inside settings", () => {
  assert.equal(
    CORE_PACK_MANIFEST.admin?.routes?.some((route) => route.id === "plugins"),
    false
  );
  assert.equal(
    CORE_PACK_MANIFEST.admin?.navigation?.some((item) => item.id === "nav-plugins"),
    false
  );
  assert.deepEqual(
    CORE_PACK_MANIFEST.admin?.settingsSections?.find(
      (section) => section.id === "core-pack-plugin-management-settings"
    ),
    {
      id: "core-pack-plugin-management-settings",
      label: "Plugins",
      kind: "custom",
      componentRef: "core-pack:plugin-management",
      namespace: "plugins",
      requiredPermission: "core-pack:plugins:read",
      order: 60
    }
  );
});

test("core-pack manifest declares admin assets without embedding their message payload", () => {
  assert.deepEqual(CORE_PACK_MANIFEST.i18n, {
    fallbackLocale: "en",
    namespaces: [{ id: "admin", surface: "admin", locales: ["en", "it"], source: "admin" }]
  });
  assert.equal(JSON.stringify(CORE_PACK_MANIFEST.i18n).includes("dashboard.title"), false);
  assert.deepEqual(CORE_PACK_ADMIN_I18N_SOURCES, [
    { source: "admin", locale: "en", messages: CORE_PACK_ADMIN_I18N.en },
    { source: "admin", locale: "it", messages: CORE_PACK_ADMIN_I18N.it }
  ]);
  assert.equal(Object.keys(CORE_PACK_ADMIN_I18N.en).length, 606);
  assert.equal(Object.keys(CORE_PACK_ADMIN_I18N.it).length, 606);
});
