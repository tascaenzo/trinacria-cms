import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter } from "../src/contracts/db-adapter.js";
import { DbAdapterError } from "../src/errors/index.js";
import {
  assertNoContributionCollisions,
  assertPluginOwnsNamespaceId,
  buildContributionKey,
  buildNamespaceId,
  buildSettingKey,
  createPluginDbScope,
  isReservedNamespaceSegment,
  isValidNamespaceSegment,
  isValidPluginId,
  parseNamespaceId
} from "../src/runtime/index.js";
import { createCapabilityToken } from "../src/tokens/index.js";

test("buildNamespaceId and parseNamespaceId are canonical", () => {
  const namespaceId = buildNamespaceId("core-pack", "users", "abc123");
  assert.equal(namespaceId, "core-pack:users:abc123");

  const parsed = parseNamespaceId(namespaceId);
  assert.deepEqual(parsed, {
    pluginId: "core-pack",
    entityName: "users",
    resourceId: "abc123"
  });
});

test("assertPluginOwnsNamespaceId rejects cross-plugin IDs", () => {
  assert.throws(() => assertPluginOwnsNamespaceId("other", "core-pack:users:abc"), DbAdapterError);
});

test("plugin namespace helpers validate reserved names and canonical keys", () => {
  assert.equal(isValidPluginId("blog-pack"), true);
  assert.equal(isValidPluginId("kernel"), false);
  assert.equal(isReservedNamespaceSegment("core-pack"), true);
  assert.equal(isValidNamespaceSegment("posts"), true);
  assert.equal(isValidNamespaceSegment("system"), false);
  assert.equal(buildContributionKey("blog-pack", "posts"), "blog-pack:posts");
  assert.equal(
    buildSettingKey("blog-pack", "editorial", "default-status"),
    "blog-pack:editorial:default-status"
  );
});

test("assertNoContributionCollisions rejects duplicate canonical keys", () => {
  assert.throws(
    () => assertNoContributionCollisions("entity", ["blog-pack:posts", "blog-pack:posts"]),
    DbAdapterError
  );
});

test("createPluginDbScope always injects pluginId", async () => {
  const calls: Array<{ entityName: string; pluginId: string }> = [];

  const db: DbAdapter = {
    repository(entityName, context) {
      calls.push({ entityName, pluginId: context.pluginId });
      return {
        async findOne() {
          return null;
        },
        async findMany() {
          return [];
        },
        async insertOne(data) {
          return data;
        },
        async updateOne() {
          return null;
        },
        async deleteOne() {
          return false;
        }
      };
    },
    async beginTransaction() {
      return {
        async commit() {},
        async rollback() {}
      };
    },
    async healthCheck() {
      return { ok: true };
    }
  };

  const scope = createPluginDbScope(db, "core-pack");
  await scope.repository("users").findMany({});

  assert.deepEqual(calls, [{ entityName: "users", pluginId: "core-pack" }]);
});

test("createCapabilityToken enforces naming convention", () => {
  const token = createCapabilityToken<{ ok: true }>("users.service");
  assert.ok(token);
  assert.throws(() => createCapabilityToken("Users Service"), /Invalid capability name/);
});
