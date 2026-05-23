import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { EntityRegistry } from "../src/runtime/entity-registry.js";
import { createMongoDbAdapter } from "../src/runtime/mongo-db-adapter.js";
import { DbPluginRuntimeStore } from "../src/runtime/plugin-runtime-store.js";
import type { PluginRuntimeRecord } from "../src/contracts/plugin-runtime.js";

const RUN_MONGO_INTEGRATION = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
const MONGO_URI =
  process.env.TRINACRIA_MONGO_URI ??
  process.env.MONGO_URI ??
  "mongodb://trinacria:trinacria@127.0.0.1:27017/trinacria_cms?authSource=admin";

test(
  "DbPluginRuntimeStore clears stale optional fields against real Mongo",
  { skip: RUN_MONGO_INTEGRATION ? false : "Set TRINACRIA_RUN_MONGO_INTEGRATION=1" },
  async () => {
    const dbName = `trinacria_runtime_store_edge_${Date.now()}`;
    const connection = await mongoose.createConnection(MONGO_URI, { dbName }).asPromise();

    try {
      const entityRegistry = new EntityRegistry();
      let tick = 0;
      const store = new DbPluginRuntimeStore({
        dbAdapter: createMongoDbAdapter({
          connection,
          entityRegistry
        }),
        entityRegistry,
        now: () => new Date(`2026-03-04T10:00:${String(tick++).padStart(2, "0")}.000Z`)
      });

      await store.initialize();
      await store.upsert({
        ...createRuntimeRecord("edge-pack", "failed"),
        failureCount: 3,
        failedAt: new Date("2026-03-04T10:01:00.000Z"),
        lastFailurePhase: "init",
        lastError: Object.assign(new Error("init failed"), { name: "PluginLifecycleError" })
      });
      await store.upsert({
        ...createRuntimeRecord("edge-pack", "loaded"),
        loadedAt: new Date("2026-03-04T10:02:00.000Z")
      });

      const [loaded] = await store.list();
      assert.equal(loaded?.state, "loaded");
      assert.equal(loaded?.lastErrorName, undefined);
      assert.equal(loaded?.lastErrorMessage, undefined);
      assert.equal(loaded?.failedAt, undefined);
      assert.equal(loaded?.loadedAt, "2026-03-04T10:02:00.000Z");

      await store.upsert({
        ...createRuntimeRecord("edge-pack", "disabled"),
        disabledAt: new Date("2026-03-04T10:03:00.000Z"),
        disabledReason: "operator stop"
      });

      const [disabled] = await store.list();
      assert.equal(disabled?.state, "disabled");
      assert.equal(disabled?.loadedAt, undefined);
      assert.equal(disabled?.disabledAt, "2026-03-04T10:03:00.000Z");
      assert.equal(disabled?.disabledReason, "operator stop");
    } finally {
      await connection.dropDatabase();
      await connection.close();
    }
  }
);

function createRuntimeRecord(
  pluginId: string,
  state: PluginRuntimeRecord["state"]
): PluginRuntimeRecord {
  return {
    manifest: {
      id: pluginId,
      version: "0.1.0",
      requiresCore: "^0.1.0"
    },
    state,
    failureCount: 0,
    statusReason: {
      code: `plugin_${state}`,
      message: `Plugin is in state ${state}`
    }
  };
}
