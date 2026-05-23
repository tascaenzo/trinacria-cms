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
  createNamespaceValidator,
  createPluginDbScope,
  isReservedNamespaceSegment,
  isValidNamespaceSegment,
  isValidPluginId,
  parseNamespaceId
} from "../src/runtime/index.js";
import type { PluginManifest } from "../src/contracts/plugin-manifest.js";
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

test("createNamespaceValidator validates plugin IDs", () => {
  const validator = createNamespaceValidator();
  assert.equal(validator.validatePluginId("blog-pack").valid, true);
  assert.equal(validator.validatePluginId("kernel").valid, false);
  assert.equal(validator.validatePluginId("").valid, false);
});

test("createNamespaceValidator validates manifest entity collisions", () => {
  const validator = createNamespaceValidator();

  const manifestA: PluginManifest = {
    id: "pack-a",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  };

  const manifestB: PluginManifest = {
    id: "pack-b",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  };

  const resultA = validator.validateManifest(manifestA);
  assert.equal(resultA.valid, true);

  validator.registerPlugin(manifestA);

  const resultB = validator.validateManifest(manifestB);
  assert.equal(resultB.valid, false);
  assert.ok(resultB.errors.some((e) => e.includes("entity")));
});

test("createNamespaceValidator validates manifest route collisions", () => {
  const validator = createNamespaceValidator();

  const manifestA: PluginManifest = {
    id: "pack-a",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    admin: { routes: [{ id: "settings", path: "/settings", label: "Settings" }] }
  };

  const manifestB: PluginManifest = {
    id: "pack-b",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    admin: { routes: [{ id: "config", path: "/settings", label: "Config" }] }
  };

  const resultA = validator.validateManifest(manifestA);
  assert.equal(resultA.valid, true);
  validator.registerPlugin(manifestA);
  const resultB = validator.validateManifest(manifestB);
  assert.equal(resultB.valid, false);
  assert.ok(resultB.errors.some((e) => e.includes("admin_route")));
});

test("createNamespaceValidator validates permission ownership collisions", () => {
  const validator = createNamespaceValidator();

  const manifestA: PluginManifest = {
    id: "pack-a",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    security: { permissions: [{ key: "pack-a:data:read", displayName: "Read data" }] }
  };

  const manifestB: PluginManifest = {
    id: "pack-b",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    security: { permissions: [{ key: "pack-a:data:read", displayName: "Read data" }] }
  };

  const resultA = validator.validateManifest(manifestA);
  assert.equal(resultA.valid, true);
  validator.registerPlugin(manifestA);
  const resultB = validator.validateManifest(manifestB);
  assert.equal(resultB.valid, false);
  assert.ok(resultB.errors.some((e) => e.includes("permission")));
});

test("createNamespaceValidator detects navigation label duplicates as warnings", () => {
  const validator = createNamespaceValidator();

  const manifest: PluginManifest = {
    id: "pack-a",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    admin: {
      navigation: [
        { id: "nav-1", label: "Dashboard", routeId: "dash" },
        { id: "nav-2", label: "Dashboard", routeId: "overview" }
      ]
    }
  };

  const result = validator.validateManifest(manifest);
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((w) => w.includes("Navigation label")));
});

test("createNamespaceValidator.unregisterPlugin cleans up registered contributions", () => {
  const validator = createNamespaceValidator();

  const manifestA: PluginManifest = {
    id: "pack-a",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "items", schemaVersion: 1 }]
  };

  validator.registerPlugin(manifestA);

  const snapshot = validator.getCollisionSnapshot();
  assert.ok(snapshot.entities.size > 0);

  validator.unregisterPlugin("pack-a");
  const snapshotAfter = validator.getCollisionSnapshot();
  assert.equal(snapshotAfter.entities.size, 0);
});

test("createNamespaceValidator.getCollisionSnapshot returns registered state", () => {
  const validator = createNamespaceValidator();

  validator.registerPlugin({
    id: "pack-a",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });
  validator.registerPlugin({
    id: "pack-b",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });

  const snapshot = validator.getCollisionSnapshot();
  assert.ok(snapshot.plugins.includes("pack-a"));
  assert.ok(snapshot.plugins.includes("pack-b"));
});

test("createNamespaceValidator.validateManifest is side-effect free", () => {
  const validator = createNamespaceValidator();

  const manifestA: PluginManifest = {
    id: "pack-a",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  };
  const manifestB: PluginManifest = {
    id: "pack-b",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  };

  assert.equal(validator.validateManifest(manifestA).valid, true);
  assert.equal(validator.validateManifest(manifestB).valid, true);
  assert.equal(validator.getCollisionSnapshot().entities.size, 0);
});

test("createNamespaceValidator.registerPlugin does not commit failed manifests", () => {
  const validator = createNamespaceValidator();

  const manifestA: PluginManifest = {
    id: "pack-a",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  };
  const manifestB: PluginManifest = {
    id: "pack-b",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }],
    settings: [{ namespace: "editorial", key: "status", type: "string", visibility: "protected" }]
  };

  assert.equal(validator.registerPlugin(manifestA).valid, true);
  assert.equal(validator.registerPlugin(manifestB).valid, false);

  const snapshot = validator.getCollisionSnapshot();
  assert.equal(snapshot.entities.get("posts"), "pack-a");
  assert.equal(snapshot.settingCanonicalKeys.size, 0);
});
