import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createCorePackPlugin } from "@trinacria-cms/core-pack";
import { CORE_TOKENS, valueProvider } from "@trinacria-cms/kernel";
import {
  createInMemoryPluginRuntimeStore,
  createMongoDbAdapter,
  EntityRegistry,
  PluginMigrationRunner,
  registerPlatformEntities,
  startCmsApp
} from "@trinacria-cms/kernel/runtime";
import { CATALOG_MANIFEST, createCatalogPlugin } from "catalog-plugin";
import { ITEM } from "catalog-plugin/deploy";
import mongoose from "mongoose";

export async function createMigrationDeployHost() {
  const state = JSON.parse(await readFile("catalog-state.json", "utf8"));
  assert.match(state.databaseName, /^trinacria_catalog_[a-f0-9]+_e2e$/);
  const uri = new URL(process.env.MONGO_URI);
  uri.pathname = "/" + state.databaseName;
  const connection = await mongoose.createConnection(uri.toString()).asPromise();
  const registry = new EntityRegistry();
  registerPlatformEntities(registry);
  registry.register({
    ownerPluginId: CATALOG_MANIFEST.id,
    entityName: "items",
    schema: ITEM,
    indexes: [{ name: "catalog_item_id", fields: { id: 1 }, unique: true }]
  });
  const adapter = createMongoDbAdapter({ connection, entityRegistry: registry });
  const packageRoot = new URL("./node_modules/catalog-plugin/", import.meta.url).pathname;
  const runner = new PluginMigrationRunner(adapter, {
    instanceId: "external-catalog-upgrade",
    packageRoot
  });
  const plugin = createCatalogPlugin();
  let handle;
  return {
    runner,
    adapter,
    async getPlugin(id) {
      if (id !== CATALOG_MANIFEST.id) return null;
      return {
        manifest: CATALOG_MANIFEST,
        migrations: plugin.migrations,
        artifactVersion: CATALOG_MANIFEST.version,
        artifactChecksum: createHash("sha256")
          .update(await readFile(packageRoot + "dist/manifest.js"))
          .digest("hex")
      };
    },
    async authenticateOperator(token) {
      return token && token === process.env.FIXTURE_OPERATOR_TOKEN
        ? { actorId: "fixture-operator", canMigrate: true }
        : null;
    },
    async verifyUpgrade() {
      await runner.assertSchemaCompatible(CATALOG_MANIFEST);
      await runner.verifyAppliedIntegrity(
        CATALOG_MANIFEST,
        plugin.migrations,
        { pluginId: CATALOG_MANIFEST.id },
        true
      );
      await runner.maintenance.set([{ pluginId: CATALOG_MANIFEST.id }], false, "fixture-operator");
      const saved = await adapter
        .repository("items", { pluginId: CATALOG_MANIFEST.id })
        .findOne({ filter: { id: state.itemId } });
      assert.equal(saved.currency, "EUR");
      assert.equal(saved.priceCents, 1300);
      assert.equal(saved.name, "Concurrent update");
      assert.equal(saved.version, 3);
      process.env.CMS_JWT_SECRET = randomBytes(48).toString("hex");
      process.env.CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID = "catalog-upgrade";
      process.env.CMS_SECURE_PAYLOAD_KEYS_JSON = JSON.stringify({
        "catalog-upgrade": randomBytes(32).toString("base64")
      });
      handle = await startCmsApp({
        coreVersion: "0.1.0",
        pluginRuntimeStore: createInMemoryPluginRuntimeStore(),
        plugins: [createCorePackPlugin(), plugin],
        migrations: { packageRoots: { "catalog-plugin": packageRoot } },
        globalProviders: [
          valueProvider(CORE_TOKENS.DB_ADAPTER, adapter),
          valueProvider(CORE_TOKENS.ENTITY_REGISTRY, registry)
        ],
        http: { host: "127.0.0.1", port: Number(process.env.CATALOG_PORT) }
      });
      const base = `http://127.0.0.1:${process.env.CATALOG_PORT}`;
      const login = await fetch(base + "/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@catalog.example.test",
          password: process.env.CATALOG_ADMIN_PASSWORD
        })
      });
      assert.equal(login.status, 200);
      const token = (await login.json()).data.accessToken;
      const response = await fetch(base + "/v1/catalog/items/" + state.itemId, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(response.status, 200);
      const item = (await response.json()).data;
      assert.equal(item.currency, "EUR");
      assert.equal(item.name, "Concurrent update");
      console.log("CATALOG_UPGRADE_PASSED");
    },
    async close() {
      await handle?.shutdown();
      await connection.close();
    }
  };
}
