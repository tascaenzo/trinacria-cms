import assert from "node:assert/strict";
import test from "node:test";
import type { HttpContext } from "@trinacria-cms/kernel";
import { createSettingsAccessMiddleware } from "../src/modules/settings/settings-access.middleware.js";
import { buildPluginAuthHeaders } from "../src/modules/settings/auth/settings-plugin-auth.js";
import { SettingsPluginAuthService } from "../src/modules/settings/auth/settings-plugin-auth.service.js";

const PLUGIN_ID = "core-pack";
const PLUGIN_SECRET = "super-secret-key-for-tests";

test("Settings access middleware authenticates admin bearer reads", async () => {
  const middleware = createSettingsAccessMiddleware(
    {
      async authenticateBearerToken(token: string) {
        assert.equal(token, "admin-token");
        return {
          id: "user-admin",
          email: "admin@example.com",
          displayName: "Admin",
          roleCodes: ["admin"],
          status: "active",
          createdAt: "2026-04-06T10:00:00.000Z",
          updatedAt: "2026-04-06T10:00:00.000Z"
        };
      }
    } as never,
    createPluginAuthService(),
    { allowAdmin: true, allowPlugin: true }
  );

  const ctx = createContext({
    method: "GET",
    url: "/v1/settings/definitions",
    headers: { authorization: "Bearer admin-token" }
  });

  let nextCalled = false;
  const result = await middleware(ctx, async () => {
    nextCalled = true;
  });

  assert.equal(result, undefined);
  assert.equal(nextCalled, true);
  assert.equal(ctx.state["corePack.settings.accessMode"], "admin");
});

test("Settings access middleware authenticates signed plugin reads", async () => {
  const middleware = createSettingsAccessMiddleware(
    {
      async authenticateBearerToken() {
        throw new Error("bearer auth should not be used");
      }
    } as never,
    createPluginAuthService(),
    { allowAdmin: true, allowPlugin: true }
  );
  const path = "/v1/settings/values/core-pack:site:title";
  const headers = buildPluginAuthHeaders({
    pluginId: PLUGIN_ID,
    secret: PLUGIN_SECRET,
    method: "GET",
    path
  });
  const ctx = createContext({ method: "GET", url: path, headers });

  let nextCalled = false;
  const result = await middleware(ctx, async () => {
    nextCalled = true;
  });

  assert.equal(result, undefined);
  assert.equal(nextCalled, true);
  assert.equal(ctx.state["corePack.settings.accessMode"], "plugin");
  assert.equal(ctx.state["corePack.settings.authenticatedPluginId"], PLUGIN_ID);
});

test("Settings access middleware rejects missing credentials", async () => {
  const middleware = createSettingsAccessMiddleware(
    {
      async authenticateBearerToken() {
        throw new Error("bearer auth should not be used");
      }
    } as never,
    createPluginAuthService(),
    { allowAdmin: true, allowPlugin: true }
  );
  const ctx = createContext({
    method: "GET",
    url: "/v1/settings/definitions",
    headers: {}
  });

  const result = await middleware(ctx, async () => {
    throw new Error("next should not be called");
  });

  assert.ok(result);
  assert.equal(result.status, 401);
});

function createPluginAuthService() {
  return new SettingsPluginAuthService({
    async getSecret(pluginId: string) {
      return pluginId === PLUGIN_ID ? PLUGIN_SECRET : null;
    }
  });
}

function createContext(input: {
  method: string;
  url: string;
  headers: Record<string, string>;
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
    body: undefined,
    state: {}
  } as HttpContext;
}
