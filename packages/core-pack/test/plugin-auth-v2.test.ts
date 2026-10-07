import assert from "node:assert/strict";
import test from "node:test";
import type { HttpContext, PluginNonceStore } from "@trinacria-cms/kernel";
import { MemoryPluginNonceStore } from "@trinacria-cms/kernel/runtime";
import { canonicalPluginJson, canonicalPluginSignatureMaterial, canonicalRequestTarget } from "@trinacria-cms/sdk/runtime";
import { EnvPluginAuthKeyProvider } from "../src/modules/settings/auth/plugin-auth-key-provider.js";
import { buildPluginAuthHeaders, canonicalPluginSignatureMaterial as coreMaterial, PLUGIN_AUTH_HEADERS } from "../src/modules/settings/auth/plugin-auth.js";
import { SettingsPluginAuthService } from "../src/modules/settings/auth/plugin-auth.service.js";
import { createSettingsAccessMiddleware } from "../src/modules/settings/auth/settings-access.middleware.js";
const secret = "0123456789abcdef0123456789abcdef";
const now = 1700000000000;
const keys = new EnvPluginAuthKeyProvider({ keys: { catalog: { current: { id: "new", secret }, previous: { id: "old", secret: secret + "previous", acceptUntil: new Date(now + 1000).toISOString() } } } });
const headers = (extra = {}) => buildPluginAuthHeaders({ pluginId: "catalog", keyId: "new", secret, method: "GET", path: "/items?b=hello+world&a=1&a=2", timestamp: now / 1000, nonce: "0123456789abcdefghijklmn", ...extra });
const context = (h = headers(), url = "/items?a=1&a=2&b=hello%20world") => ({ req: { headers: h, url, method: "GET" }, body: undefined, state: {} } as unknown as HttpContext);
const service = (store: PluginNonceStore = new MemoryPluginNonceStore(10, () => now), clock = () => now) => new SettingsPluginAuthService(keys, null, store, { now: clock, maxSkewSeconds: 300 });
test("shared signing golden bytes preserve query order and reject ambiguous input", () => {
  assert.equal(canonicalRequestTarget("/items%2fchild/?b=hello+world&a=1&a=2&x=!'()*"), "/items%2Fchild?a=1&a=2&b=hello%20world&x=%21%27%28%29%2A");
  const input = { pluginId: "catalog", keyId: "new", method: "get", path: "/items?b=2&a=1", timestamp: 1700000000, nonce: "0123456789abcdefghijklmn", bodyHash: "0".repeat(64) };
  const golden = '{"bodyHash":"' + "0".repeat(64) + '","keyId":"new","method":"GET","nonce":"0123456789abcdefghijklmn","pluginId":"catalog","requestTarget":"/items?a=1&b=2","timestamp":1700000000,"version":2}';
  assert.equal(canonicalPluginSignatureMaterial(input), golden); assert.equal(coreMaterial(input), golden);
  for (const path of ["/a%FF", "/a%xy", "/?q=%C3", "/?q=%GG", "/\n"]) assert.throws(() => canonicalRequestTarget(path));
  for (const body of [JSON.parse('{"__proto__":1}'), { constructor: 1 }, [undefined], Array(1), new Date(), Infinity]) assert.throws(() => canonicalPluginJson(body));
});
test("invalid signature never consumes nonce; altered query, v1 and unknown key reject", async () => {
  const auth = service(); const valid = headers();
  await assert.rejects(auth.authenticateRequest(context({ ...valid, [PLUGIN_AUTH_HEADERS.signature]: "0".repeat(64) })), { code: "plugin_auth_invalid_signature" });
  await assert.rejects(auth.authenticateRequest(context(valid, "/items?a=2&a=1&b=hello%20world")), { code: "plugin_auth_invalid_signature" });
  await assert.rejects(auth.authenticateRequest(context({ ...valid, [PLUGIN_AUTH_HEADERS.version]: "1" })), { code: "plugin_auth_version_unsupported" });
  await assert.rejects(auth.authenticateRequest(context({ ...valid, [PLUGIN_AUTH_HEADERS.version]: "" })), { code: "plugin_auth_missing_headers" });
  await assert.rejects(auth.authenticateRequest(context({ ...valid, [PLUGIN_AUTH_HEADERS.keyId]: "unknown" })), { code: "plugin_auth_plugin_not_configured" });
  assert.equal(await auth.authenticateRequest(context(valid)), "catalog");
});
test("future timestamps retain their nonce for the whole acceptance window; full store refuses new entries", async () => {
  let clock = now; const store = new MemoryPluginNonceStore(1, () => clock); const auth = service(store, () => clock);
  const future = headers({ timestamp: now / 1000 + 300 }); await auth.authenticateRequest(context(future));
  clock += 599000;
  await assert.rejects(auth.authenticateRequest(context(future)), { code: "plugin_auth_nonce_replay" });
  await assert.rejects(auth.authenticateRequest(context(headers({ timestamp: clock / 1000, nonce: "another-unique-nonce-0000" }))), { code: "plugin_auth_nonce_store_unavailable" });
  clock += 2000;
  assert.equal(await auth.authenticateRequest(context(headers({ timestamp: clock / 1000, nonce: "another-unique-nonce-0000" }))), "catalog");
});
test("current/previous explicit IDs rotate only until expiry, weak keys rejected", async () => {
  const previous = headers({ keyId: "old", secret: secret + "previous" });
  assert.equal(await service().authenticateRequest(context(previous)), "catalog");
  await assert.rejects(service(undefined, () => now + 1000).authenticateRequest(context(previous)), { code: "plugin_auth_plugin_not_configured" });
  assert.throws(() => new EnvPluginAuthKeyProvider({ keys: { catalog: { current: { id: "new", secret: "short" } } } }), /32 bytes/);
});
test("store outage returns 503 and cannot fall back to local memory", async () => {
  const auth = service({ shared: true, async consume() { throw new Error("DB unavailable password=not-for-output"); } });
  const middleware = createSettingsAccessMiddleware({} as never, auth, { allowAdmin: false, allowPlugin: true });
  const result = await middleware(context(), async () => assert.fail("Unauthorized continuation"));
  assert.equal((result as { status: number }).status, 503);
  assert.ok(!JSON.stringify(result).includes("password=")); assert.equal(auth.getObservabilitySnapshot().storeFailures, 1);
});
