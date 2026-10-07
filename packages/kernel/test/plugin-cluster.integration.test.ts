import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { s } from "@trinacria/schema";
import { createMongoDbAdapter, EntityRegistry, InMemoryPluginRuntime, PluginClusterCoordinator, PlatformMaintenance, HostUnitOfWork } from "../src/runtime/index.js";
const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
test("two hosts converge desired state, drain activity, fence writes, restart and reject stale leases/artifacts", { skip: !enabled }, async () => {
  const uri = process.env.TRINACRIA_MONGO_URI ?? "mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", dbName = `trinacria_cluster_test_${Date.now()}`;
  const connections: mongoose.Connection[] = []; const coordinators: PluginClusterCoordinator[] = []; let now = Date.now();
  const artifacts = { source: { version: "1.0.0", checksum: "a".repeat(64) }, receiver: { version: "1.0.0", checksum: "a".repeat(64) }, worker: { version: "1.0.0", checksum: "a".repeat(64) } };
  let workerLoads = 0;
  async function host(instanceId: string, mismatch = false) {
    const connection = await mongoose.createConnection(uri, { dbName }).asPromise(); connections.push(connection);
    const registry = new EntityRegistry(); registry.register({ ownerPluginId: "worker", entityName: "items", schema: s.object({}, { strict: false }) });
    const db = createMongoDbAdapter({ connection, entityRegistry: registry }); const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
    await runtime.register({ manifest: { id: "source", version: "1.0.0", requiresCore: "*" } });
    await runtime.register({ manifest: { id: "receiver", version: "1.0.0", requiresCore: "*", dependencies: [{ pluginId: "source", versionRange: "*" }] } });
    await runtime.register({ manifest: { id: "worker", version: "1.0.0", requiresCore: "*" }, onLoad() { workerLoads++; } });
    const cluster = new PluginClusterCoordinator(db, registry, runtime, { instanceId, artifacts: mismatch ? { ...artifacts, worker: { version: "1.0.0", checksum: "b".repeat(64) } } : artifacts, activity: runtime.activity, now: () => now, leaseMs: 15000, heartbeatMs: 5000, operationTimeoutMs: 1000 }); coordinators.push(cluster);
    await cluster.initialize(); db.setWriteGuard((repos, ns) => cluster.fenceWrites(repos, ns)); await cluster.reconcile(); return { db, runtime, cluster };
  }
  try {
    const first = await host("one"), second = await host("two"); assert.equal((await first.cluster.readiness()).ok, true);
    await assert.rejects(first.cluster.submit("source", { operation: "disable", expectedRevision: 1, idempotencyKey: "disable-source" }, "operator"), { code: "plugin_cluster_conflict" });
    const items = second.db.repository("items", { pluginId: "worker" }); await items.insertOne({ id: "before" });
    const input = { operation: "disable" as const, expectedRevision: 1, idempotencyKey: "disable-worker" }; const accepted = await first.cluster.submit("worker", input, "operator"); assert.equal(accepted.status, "pending"); assert.equal(accepted.participants.length, 2);
    assert.equal((await second.cluster.submit("worker", input, "operator")).operationId, accepted.operationId);
    await assert.rejects(first.cluster.submit("worker", { ...input, operation: "enable" }, "operator"), { code: "plugin_cluster_conflict" });
    await assert.rejects(second.cluster.assertActive("worker"), { code: "plugin_cluster_disabled" }); await assert.rejects(items.insertOne({ id: "blocked" }), { code: "plugin_cluster_disabled" });
    assert.equal(await items.findOne({ filter: { id: "blocked" } }), null);
    let release!: () => void; const active = second.runtime.activity.run(["worker"], () => new Promise<void>(resolve => { release = resolve; }));
    await first.cluster.reconcile(); const slow = second.cluster.reconcile(); await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal((await first.cluster.status(accepted.operationId)).status, "pending"); release(); await active; await slow;
    assert.equal((await first.cluster.status(accepted.operationId)).status, "succeeded"); assert.equal(second.runtime.list().find(r => r.manifest.id === "worker")!.state, "disabled");
    const loadedBeforeRestart = workerLoads; await second.cluster.close(); const restarted = await host("two"); assert.equal(workerLoads, loadedBeforeRestart); assert.equal((await restarted.cluster.readiness()).ok, true);
    const revision = (await first.cluster.snapshot("worker")).desired.revision;
    const competing = await Promise.allSettled([first.cluster.submit("worker", { operation: "enable", expectedRevision: revision, idempotencyKey: "enable-worker-one" }, "operator"), restarted.cluster.submit("worker", { operation: "enable", expectedRevision: revision, idempotencyKey: "enable-worker-two" }, "operator")]); assert.equal(competing.filter(r => r.status === "fulfilled").length, 1); assert.equal((competing.find(r => r.status === "rejected") as PromiseRejectedResult).reason.code, "plugin_cluster_conflict");
    await first.cluster.reconcile(); await restarted.cluster.reconcile();
    const mismatch = await host("different-artifact", true); assert.equal((await mismatch.cluster.readiness()).ok, false); await assert.rejects(mismatch.cluster.assertActive("worker"), { code: "plugin_cluster_artifact_mismatch" });
    const disable = await first.cluster.submit("worker", { operation: "disable", expectedRevision: (await first.cluster.snapshot("worker")).desired.revision, idempotencyKey: "deploy-disable-worker" }, "operator");
    await first.cluster.reconcile(); now += 1001;
    assert.equal((await first.cluster.status(disable.operationId)).status, "partial");
    await restarted.cluster.reconcile(); await mismatch.cluster.reconcile();
    const desiredRevision = (await first.cluster.snapshot("worker")).desired.revision;
    const maintenance = new PlatformMaintenance(mismatch.db, new HostUnitOfWork(mismatch.db));
    await assert.rejects(mismatch.cluster.adoptDeployedArtifact("worker", desiredRevision, "operator", async () => {}), { code: "platform_maintenance" });
    await maintenance.set([{ pluginId: "worker" }], true, "operator");
    await assert.rejects(mismatch.cluster.adoptDeployedArtifact("worker", desiredRevision, "operator", async () => { throw new Error("schema mismatch"); }), /schema mismatch/);
    const deployed = await mismatch.cluster.adoptDeployedArtifact("worker", desiredRevision, "operator", async () => {});
    assert.equal(deployed.artifactChecksum, "b".repeat(64)); assert.equal(deployed.enabled, false);
    await assert.rejects(first.cluster.submit("worker", { operation: "enable", expectedRevision: deployed.revision, idempotencyKey: "old-artifact-enable" }, "operator"), { code: "plugin_cluster_artifact_mismatch" });
    await maintenance.set([{ pluginId: "worker" }], false, "operator");
    // Restore the same verified artifact for the following expiry check.
    await first.cluster.reconcile(); await restarted.cluster.reconcile(); await mismatch.cluster.reconcile();
    await maintenance.set([{ pluginId: "worker" }], true, "operator");
    const restored = await first.cluster.adoptDeployedArtifact("worker", deployed.revision, "operator", async () => {});
    await maintenance.set([{ pluginId: "worker" }], false, "operator");
    await first.cluster.submit("worker", { operation: "enable", expectedRevision: restored.revision, idempotencyKey: "restore-enable-worker" }, "operator");
    await first.cluster.reconcile(); await restarted.cluster.reconcile();
    // Expiry during user work must abort the commit, not just the next request.
    await assert.rejects(first.db.withTransaction({ pluginId: "worker" }, async tx => {
      await tx.repository("items", { pluginId: "worker" }).insertOne({ id: "expired-before-commit" });
      now += 15001;
    }), { code: "platform_lease_lost" });
    assert.equal(await items.findOne({ filter: { id: "expired-before-commit" } }), null);
     assert.equal((await first.cluster.readiness()).ok, false); await assert.rejects(first.db.repository("items", { pluginId: "worker" }).insertOne({ id: "stale" }), { code: "platform_lease_lost" }); assert.equal(await items.findOne({ filter: { id: "stale" } }), null);
    await assert.rejects(first.cluster.heartbeat(), { code: "platform_lease_lost" });
    await connections[0]!.close();
    assert.equal((await first.cluster.readiness()).ok, false);
    await assert.rejects(first.cluster.assertActive("worker"), { code: "plugin_cluster_unavailable" });
  } finally { await Promise.allSettled(coordinators.map(c => c.close())); await connections.find(c => c.readyState === 1)?.dropDatabase(); await Promise.all(connections.map(c => c.close())); }
});
