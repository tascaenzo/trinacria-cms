import assert from "node:assert/strict";
import test from "node:test";
import { CmsSdkHttpError, createCmsSdkClientCore } from "../src/runtime/index.js";

test("sdk core client serializes query, auth header and json body", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const client = createCmsSdkClientCore({
    baseUrl: "http://localhost:3000/",
    getAccessToken: async () => "token-123",
    transport: {
      async request(request) {
        calls.push(request as unknown as Record<string, unknown>);
        return {
          status: 200,
          headers: { "content-type": "application/json" },
          data: { ok: true }
        };
      }
    }
  });

  const response = await client.request<{ ok: boolean }>({
    method: "POST",
    path: "/v1/users/:id",
    pathParams: { id: "abc" },
    query: { limit: 10, tags: ["a", "b"] },
    body: { name: "Alice" }
  });

  assert.equal(response.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "http://localhost:3000/v1/users/abc?limit=10&tags=a&tags=b");
  assert.equal(calls[0]?.method, "POST");
  assert.equal((calls[0]?.headers as Record<string, string>).authorization, "Bearer token-123");
  assert.equal((calls[0]?.headers as Record<string, string>)["content-type"], "application/json");
  assert.equal(calls[0]?.body, JSON.stringify({ name: "Alice" }));
});

test("sdk core client throws CmsSdkHttpError on non-2xx response", async () => {
  const client = createCmsSdkClientCore({
    baseUrl: "http://localhost:3000",
    transport: {
      async request() {
        return {
          status: 401,
          headers: { "content-type": "application/json" },
          data: {
            error: {
              code: "auth_invalid_credentials",
              message: "Invalid credentials"
            }
          }
        };
      }
    }
  });

  await assert.rejects(
    async () =>
      client.request({
        method: "GET",
        path: "/v1/auth/me"
      }),
    (error) =>
      error instanceof CmsSdkHttpError && error.status === 401 && typeof error.data === "object"
  );
});

test("sdk core client attaches a timeout signal by default", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const client = createCmsSdkClientCore({
    baseUrl: "http://localhost:3000",
    requestTimeoutMs: 10,
    transport: {
      async request(request) {
        calls.push(request as unknown as Record<string, unknown>);
        return {
          status: 200,
          headers: { "content-type": "application/json" },
          data: { ok: true }
        };
      }
    }
  });

  await client.request({
    method: "GET",
    path: "/v1/auth/me"
  });

  assert.ok(calls[0]?.signal);
});
