import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import mongoose from "mongoose";
import { s } from "@trinacria/schema";
import { createMongoDbAdapter, EntityRegistry, InMemoryPluginRuntime, PluginRemovalService, PluginMigrationRunner, registerPlatformEntities, PLATFORM_ENTITIES } from "../src/runtime/index.js";
const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
const uri = process.env.TRINACRIA_MONGO_URI ?? process.env.MONGO_URI ?? "mongodb://trinacria:trinacria@127.0.0.1:27017/trinacria_cms?authSource=admin";

test("uninstall preserves data, blocks dependents/undrained work; purge requires reviewed owner/reference plan", { skip: !enabled }, async () => {
  const connection = await mongoose.createConnection(uri, { dbName: `trinacria_c0_removal_test_${Date.now()}` }).asPromise();
  const root = await mkdtemp(join(tmpdir(), "trinacria-removal-"));
  try {
    const registry = new EntityRegistry(); registerPlatformEntities(registry);
    registry.register({ ownerPluginId: "catalog-plugin", entityName: "items", schema: s.object({}, { strict: false }) });
    const adapter = createMongoDbAdapter({ connection, entityRegistry: registry });
    await adapter.ensureIndexes("kernel", PLATFORM_ENTITIES.map(entity => entity.entityName));
    const runner = new PluginMigrationRunner(adapter, { instanceId: "removal", packageRoot: root });
    const manifest = { id: "catalog-plugin", version: "1.0.0", requiresCore: "*", entities: [{ name: "items", schemaVersion: 1 }] };
    await runner.assertSchemaCompatible(manifest);
    const items = adapter.repository("items", { pluginId: manifest.id }); await items.insertOne({ id: "retained" });
    const runtime = new InMemoryPluginRuntime({ coreVersion: "1.0.0" }); await runtime.register(manifest); await runtime.load(manifest.id);
    let authorized = false, references: string[] = [], foreignOwner = false;
    const phases: string[] = [];
    const service = new PluginRemovalService(runtime, runtime.activity, runner, adapter, {
      async authorizeOperator() { if (!authorized) throw new Error("Permission denied"); },
      async drainInstances() { phases.push("cluster-drained"); },
      async revokeCredentialsAndGrants() { phases.push("revoked"); },
      async detachArtifact() { phases.push("detached"); },
      async planPurge() { return { references, pendingDeliveries: 0, resources: [{ id: "items", ownerPluginId: foreignOwner ? "other-plugin" : manifest.id }] }; },
      async purgeOwnedResources(pluginId, resources) { assert.equal(pluginId, manifest.id); assert.deepEqual(resources, ["items"]); await items.deleteOne({ filter: { id: "retained" } }); }
    }, { drainTimeoutMs: 5 });
    await assert.rejects(service.uninstall(manifest.id, "operator"), /Permission denied/); assert.ok(await items.findOne({ filter: { id: "retained" } }));
    authorized = true;
    await runtime.register({ id: "consumer", version: "1.0.0", requiresCore: "*", dependencies: [{ pluginId: manifest.id, versionRange: "*" }] });
    await assert.rejects(service.uninstall(manifest.id, "operator"), /Required dependents/);
    await runtime.unregister("consumer");
    let finish!: () => void;
    const active = runtime.activity.run([manifest.id], () => new Promise<void>(resolve => { finish = resolve; }));
    await assert.rejects(service.uninstall(manifest.id, "operator"), /remains active/);
    assert.equal(runtime.list().length, 1); assert.equal(runtime.activity.snapshot(manifest.id).active, 1);
    assert.ok(await items.findOne({ filter: { id: "retained" } })); assert.equal(phases.includes("detached"), false);
    finish(); await active;
    await service.uninstall(manifest.id, "operator");
    assert.equal(runtime.list().length, 0); assert.ok(await items.findOne({ filter: { id: "retained" } }));
    assert.ok(phases.includes("revoked")); assert.ok(phases.includes("detached"));
    await assert.rejects(service.purge(manifest.id, "operator", "", ["items"]), /backup/);
    references = ["editorial:entry-1"]; await assert.rejects(service.purge(manifest.id, "operator", "verified-backup", ["items"]), /references/);
    references = []; foreignOwner = true; await assert.rejects(service.purge(manifest.id, "operator", "verified-backup", ["items"]), /plan changed/);
    foreignOwner = false; await service.purge(manifest.id, "operator", "verified-backup", ["items"]);
    assert.equal(await items.findOne({ filter: { id: "retained" } }), null);
    const audit = await adapter.repository("platform_audit", { pluginId: "kernel" }).findMany({});
    assert.ok(audit.some((item: any) => item.action === "plugin.uninstalled")); assert.ok(audit.some((item: any) => item.action === "plugin.purged"));
  } finally { await connection.dropDatabase(); await connection.close(); await rm(root, { recursive: true, force: true }); }
});
