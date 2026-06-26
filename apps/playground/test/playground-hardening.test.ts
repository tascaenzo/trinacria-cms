import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "node:http";
import test from "node:test";
import type { HttpContext } from "@trinacria-cms/kernel";
import {
  assertProductionSecurityConfig,
  createCookieCsrfOriginGuard,
  createPlaygroundSecurityConfig
} from "../src/playground-hardening.js";

test("production security config disables docs by default and requires strict JWT", () => {
  const env = {
    NODE_ENV: "production",
    HTTP_CORS_ORIGINS: "https://admin.example.com",
    CMS_JWT_SECRET: "a-production-secret-with-enough-entropy-123"
  };

  const config = createPlaygroundSecurityConfig(env);

  assert.equal(config.production, true);
  assert.equal(config.docsEnabled, false);
  assert.equal(config.openApiEnabled, false);
  assert.equal(config.csrfProtection, true);
  assert.equal(config.strictJwtSecretRequired, true);
  assert.deepEqual(config.corsOrigins, ["https://admin.example.com"]);
  assert.doesNotThrow(() => assertProductionSecurityConfig(config, env));
});

test("production security config rejects missing or wildcard CORS origins", () => {
  const baseEnv = {
    NODE_ENV: "production",
    CMS_JWT_SECRET: "a-production-secret-with-enough-entropy-123"
  };

  assert.throws(
    () => assertProductionSecurityConfig(createPlaygroundSecurityConfig(baseEnv), baseEnv),
    /HTTP_CORS_ORIGINS is required/
  );

  const wildcardEnv = { ...baseEnv, HTTP_CORS_ORIGINS: "*" };
  assert.throws(
    () => assertProductionSecurityConfig(createPlaygroundSecurityConfig(wildcardEnv), wildcardEnv),
    /cannot contain/
  );
});

test("production security config rejects weak JWT secrets", () => {
  const env = {
    NODE_ENV: "production",
    HTTP_CORS_ORIGINS: "https://admin.example.com",
    CMS_JWT_SECRET: "change-me-with-a-long-random-secret"
  };

  assert.throws(
    () => assertProductionSecurityConfig(createPlaygroundSecurityConfig(env), env),
    /known weak placeholder/
  );
});

test("cookie CSRF guard rejects mutating cookie requests from untrusted origins", async () => {
  const guard = createCookieCsrfOriginGuard(["https://admin.example.com"]);

  const blocked = await guard(
    createHttpContext({
      method: "POST",
      headers: {
        cookie: "cms_access_token=token",
        origin: "https://evil.example.com"
      }
    }),
    async () => ({ ok: true })
  );

  assert.ok(blocked && typeof blocked === "object");
  assert.equal((blocked as { status?: number }).status, 403);
  assert.deepEqual((blocked as { body?: unknown }).body, {
    error: {
      code: "csrf_origin_rejected",
      message: "Request origin is not trusted for cookie-authenticated mutations"
    }
  });
});

test("cookie CSRF guard allows trusted origins and bearer-only mutations", async () => {
  const guard = createCookieCsrfOriginGuard(["https://admin.example.com"]);

  const trusted = await guard(
    createHttpContext({
      method: "PATCH",
      headers: {
        cookie: "cms_access_token=token",
        origin: "https://admin.example.com/settings"
      }
    }),
    async () => ({ ok: true })
  );

  assert.deepEqual(trusted, { ok: true });

  const bearerOnly = await guard(
    createHttpContext({
      method: "PATCH",
      headers: {
        authorization: "Bearer token",
        origin: "https://evil.example.com"
      }
    }),
    async () => ({ ok: true })
  );

  assert.deepEqual(bearerOnly, { ok: true });
});

function createHttpContext(input: {
  method: string;
  headers: Record<string, string>;
}): HttpContext {
  return {
    req: {
      method: input.method,
      headers: input.headers
    } as IncomingMessage,
    res: {} as ServerResponse,
    params: {},
    query: {},
    body: undefined,
    signal: new AbortController().signal,
    abort() {},
    state: {}
  };
}
