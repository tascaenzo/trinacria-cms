import assert from "node:assert/strict";
import test from "node:test";
import type { HttpContext } from "@trinacria-cms/kernel";
import {
  buildPluginAuthHeaders,
  createSettingsPluginAuthMiddleware,
  getAuthenticatedPluginId,
  SettingsPluginAuthError,
  SettingsPluginAuthService
} from "../src/modules/settings/index.js";

const PLUGIN_ID = "core-pack";
const PLUGIN_SECRET = "super-secret-key-for-tests";

test("SettingsPluginAuthService authenticates a valid signed request", async () => {
  const service = createAuthService();
  const body = {
    plaintext: "sk_live_value",
    updatedBy: "core-pack-tests"
  };
  const path = "/v1/settings/secrets/core-pack:integrations:stripe_api_key";
  const headers = buildPluginAuthHeaders({
    pluginId: PLUGIN_ID,
    secret: PLUGIN_SECRET,
    method: "PUT",
    path,
    body
  });

  const ctx = createContext({
    method: "PUT",
    url: path,
    headers,
    body
  });

  const authenticatedPluginId = await service.authenticateRequest(ctx);
  assert.equal(authenticatedPluginId, PLUGIN_ID);
});

test("SettingsPluginAuthService rejects missing headers", async () => {
  const service = createAuthService();
  const ctx = createContext({
    method: "PUT",
    url: "/v1/settings/secrets/core-pack:integrations:stripe_api_key",
    headers: {},
    body: { plaintext: "x" }
  });

  await assertAuthError(() => service.authenticateRequest(ctx), "plugin_auth_missing_headers");
});

test("SettingsPluginAuthService rejects replayed nonce", async () => {
  const service = createAuthService();
  const body = { plaintext: "value" };
  const path = "/v1/settings/secrets/core-pack:integrations:stripe_api_key";
  const headers = buildPluginAuthHeaders({
    pluginId: PLUGIN_ID,
    secret: PLUGIN_SECRET,
    method: "PUT",
    path,
    body,
    nonce: "fixed-replay-nonce",
    timestamp: Math.floor(Date.now() / 1000)
  });

  const first = createContext({ method: "PUT", url: path, headers, body });
  const second = createContext({ method: "PUT", url: path, headers, body });

  assert.equal(await service.authenticateRequest(first), PLUGIN_ID);
  await assertAuthError(() => service.authenticateRequest(second), "plugin_auth_nonce_replay");
});

test("SettingsPluginAuthService rejects expired timestamp", async () => {
  const service = createAuthService({ maxSkewSeconds: 10 });
  const body = { value: true };
  const path = "/v1/settings/values/core-pack:features:beta";
  const headers = buildPluginAuthHeaders({
    pluginId: PLUGIN_ID,
    secret: PLUGIN_SECRET,
    method: "PUT",
    path,
    body,
    timestamp: Math.floor(Date.now() / 1000) - 60,
    nonce: "expired-nonce"
  });

  const ctx = createContext({ method: "PUT", url: path, headers, body });
  await assertAuthError(() => service.authenticateRequest(ctx), "plugin_auth_timestamp_expired");
});

test("SettingsPluginAuthService accepts rotated key ring secrets", async () => {
  const service = new SettingsPluginAuthService(
    {
      async getSecret() {
        return null;
      },
      async getSecrets(pluginId: string) {
        if (pluginId !== PLUGIN_ID) return [];
        return ["old-secret-not-used", PLUGIN_SECRET];
      }
    },
    null,
    { maxSkewSeconds: 300 }
  );

  const body = { key: "core-pack:features:new_home", value: true };
  const path = "/v1/settings/values/core-pack:features:new_home";
  const headers = buildPluginAuthHeaders({
    pluginId: PLUGIN_ID,
    secret: PLUGIN_SECRET,
    method: "PUT",
    path,
    body
  });
  const ctx = createContext({ method: "PUT", url: path, headers, body });
  const authenticatedPluginId = await service.authenticateRequest(ctx);
  assert.equal(authenticatedPluginId, PLUGIN_ID);
});

test("SettingsPluginAuth middleware stores authenticated plugin id in context state", async () => {
  const service = createAuthService();
  const body = { key: "core-pack:features:new_home", value: true };
  const path = "/v1/settings/values/core-pack:features:new_home";
  const headers = buildPluginAuthHeaders({
    pluginId: PLUGIN_ID,
    secret: PLUGIN_SECRET,
    method: "PUT",
    path,
    body
  });

  const ctx = createContext({ method: "PUT", url: path, headers, body });
  const middleware = createSettingsPluginAuthMiddleware(service);

  let nextCalled = false;
  await middleware(ctx, async () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(getAuthenticatedPluginId(ctx), PLUGIN_ID);
});

function createAuthService(options?: { maxSkewSeconds?: number }) {
  return new SettingsPluginAuthService(
    {
      async getSecret(pluginId: string) {
        return pluginId === PLUGIN_ID ? PLUGIN_SECRET : null;
      }
    },
    null,
    { maxSkewSeconds: options?.maxSkewSeconds ?? 300 }
  );
}

function createContext(input: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}): HttpContext {
  return {
    req: {
      method: input.method,
      url: input.url,
      headers: input.headers
    },
    res: {},
    params: {},
    query: {},
    body: input.body,
    state: {}
  } as HttpContext;
}

async function assertAuthError(
  action: () => Promise<unknown>,
  expectedCode: string
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof SettingsPluginAuthError);
    assert.equal(error.code, expectedCode);
    return true;
  });
}
