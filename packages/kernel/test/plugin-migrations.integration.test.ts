import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import mongoose from "mongoose";
import { s } from "@trinacria/schema";
import { createMongoDbAdapter, EntityRegistry, HostUnitOfWork, PluginMigrationRunner, PlatformLocks, computeMigrationChecksum, registerPlatformEntities, PLATFORM_ENTITIES } from "../src/runtime/index.js";
import type { PluginManifest, PluginMigrationDefinition } from "../src/contracts/index.js";
const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
const uri = process.env.TRINACRIA_MONGO_URI ?? process.env.MONGO_URI ?? "mongodb://trinacria:trinacria@127.0.0.1:27017/trinacria_cms?authSource=admin";

test("migration upgrade is fenced, resumable and atomic with checkpoint/audit; checksum and chains reject", { skip: !enabled }, async () => {
  const connection = await mongoose.createConnection(uri, { dbName: `trinacria_c0_upgrade_test_${Date.now()}` }).asPromise();
  const root = await mkdtemp(join(tmpdir(), "trinacria-migrations-"));
  try {
    await writeFile(join(root, "step.mjs"), "// Immutable fixture transformation v1\n");
    const registry = new EntityRegistry(); registerPlatformEntities(registry);
    registry.register({ ownerPluginId: "catalog-plugin", entityName: "items", schema: s.object({}, { strict: false }), indexes: [{ fields: { id: 1 }, unique: true }] });
    const adapter = createMongoDbAdapter({ connection, entityRegistry: registry });
    await adapter.ensureIndexes("kernel", PLATFORM_ENTITIES.map(entity => entity.entityName));
    await adapter.ensureIndexes("catalog-plugin", ["items"]);
    const runner = new PluginMigrationRunner(adapter, { instanceId: "first", packageRoot: root, batchSize: 2 });
    const namespace = { pluginId: "catalog-plugin" };
    const old: PluginManifest = { id: namespace.pluginId, version: "1.0.0", requiresCore: "*", entities: [{ name: "items", schemaVersion: 1 }] };
    await runner.assertSchemaCompatible(old);
    adapter.setWriteGuard((repositories, namespaces) => runner.maintenance.fence(repositories, namespaces));
    const items = adapter.repository<{ id: string; version: number; label: string }>("items", namespace);
    for (let i = 0; i < 5; i++) await items.insertOne({ id: String(i), version: 1, label: `Item ${i}` });
    let fail = true, runs = 0;
    const definition: PluginMigrationDefinition = { id: "0001-add-status", checksum: await computeMigrationChecksum(root, ["step.mjs"]), sourceFiles: ["step.mjs"], entities: ["items"], fromSchemaVersion: 1, toSchemaVersion: 2, kind: "batched", destructive: false, idempotent: true,
      async run(context) { runs++; const last = typeof context.checkpoint === "string" ? context.checkpoint : "";
        const repository = context.repository<{ id: string; version: number; label: string }>("items");
        const batch = await repository.findMany({ filter: { id: { $gt: last }, version: 1 }, sort: { id: "asc" }, limit: context.batchSize });
        for (const item of batch) await repository.updateOne({ filter: { id: item.id, version: 1 } }, { version: 2, label: `${item.label} migrated` });
        if (fail && last === "1") throw new Error("Injected crash after data, before checkpoint");
        return { done: batch.length < context.batchSize, checkpoint: batch.at(-1)?.id ?? last };
      }
    };
    const { run, ...metadata } = definition;
    const next: PluginManifest = { ...old, version: "2.0.0", entities: [{ name: "items", schemaVersion: 2 }], migrations: [metadata] };
    assert.equal((await runner.plan(next, [definition])).pending.length, 1); assert.equal(runs, 0);
    assert.equal((await runner.status(namespace)).length, 0);
    await assert.rejects(runner.assertSchemaCompatible(next), /Pending migration/);
    const options = { actorId: "operator", artifactVersion: next.version, artifactChecksum: "a".repeat(64) };
    await assert.rejects(runner.apply(next, [definition], options), /require maintenance/);
    await runner.maintenance.set([namespace], true, "operator");
    await assert.rejects(items.insertOne({ id: "blocked", version: 1 }), /paused/);
    await assert.rejects(adapter.withTransaction(namespace, async scoped => { await scoped.repository("items", namespace).insertOne({ id: "blocked-tx" }); }), /paused/);
    await assert.rejects(runner.apply(next, [definition], options), /Injected crash/);
    assert.equal((await items.findMany({ filter: { version: 2 } })).length, 2);
    assert.equal((await runner.status(namespace))[0].checkpoint, "1");
    assert.equal((await runner.status(namespace))[0].status, "failed");
    await assert.rejects(runner.apply(next, [definition], options), /explicit idempotent resume/);
    fail = false;
    await runner.apply(next, [definition], { ...options, resumeFailed: true });
    assert.equal((await items.findMany({ filter: { version: 2 } })).length, 5);
    assert.equal((await runner.status(namespace))[0].status, "applied");
    assert.equal((await adapter.repository("platform_audit", { pluginId: "kernel" }).findMany({})).length, 1);
    await runner.assertSchemaCompatible(next);
    assert.equal((await runner.plan(next, [definition])).pending.length, 0);
    await assert.rejects(runner.assertSchemaCompatible(old), /incompatible schema/);
    await writeFile(join(root, "step.mjs"), "// Changed implementation\n");
    await assert.rejects(runner.plan(next, [definition]), /checksum.*mismatch/);
    await runner.maintenance.set([namespace], false, "operator");
    await items.insertOne({ id: "after", version: 2 });
    const broken = { ...next, entities: [{ name: "items", schemaVersion: 4 }], migrations: [] };
    await assert.rejects(runner.plan(broken, []), /recorded migration was removed/);
  } finally { await connection.dropDatabase(); await connection.close(); await rm(root, { recursive: true, force: true }); }
});

test("two runners cannot acquire one lease; stale epoch cannot commit after takeover", { skip: !enabled }, async () => {
  const connection = await mongoose.createConnection(uri, { dbName: `trinacria_c0_fence_test_${Date.now()}` }).asPromise();
  try {
    const registry = new EntityRegistry(); registerPlatformEntities(registry);
    registry.register({ ownerPluginId: "catalog-plugin", entityName: "items", schema: s.object({}, { strict: false }) });
    const adapter = createMongoDbAdapter({ connection, entityRegistry: registry });
    await adapter.ensureIndexes("kernel", PLATFORM_ENTITIES.map(entity => entity.entityName));
    let now = Date.now(); const first = new PlatformLocks(adapter, () => now), second = new PlatformLocks(adapter, () => now);
    const leases = await Promise.all([first.acquire("upgrade", "one", 30), second.acquire("upgrade", "two", 30)]);
    assert.equal(leases.filter(Boolean).length, 1);
    const old = leases.find(Boolean)!; now += 31;
    const replacement = await second.acquire("upgrade", "new", 30); assert.ok(replacement); assert.ok(replacement.epoch > old.epoch);
    const uow = new HostUnitOfWork(adapter), namespaces = [{ pluginId: "kernel" }, { pluginId: "catalog-plugin" }];
    await assert.rejects(uow.run(namespaces, async repositories => { await repositories.repository("items", namespaces[1]).insertOne({ id: "stale" }); await first.fence(repositories, old); }), /stale runner/);
    assert.equal(await adapter.repository("items", namespaces[1]).findOne({ filter: { id: "stale" } }), null);
    await uow.run(namespaces, async repositories => { await second.fence(repositories, replacement); await repositories.repository("items", namespaces[1]).insertOne({ id: "current" }); });
    assert.ok(await adapter.repository("items", namespaces[1]).findOne({ filter: { id: "current" } }));
  } finally { await connection.dropDatabase(); await connection.close(); }
});

test("index migration failure retains maintenance and reconciles safely on resume", { skip: !enabled }, async () => {
  const connection = await mongoose.createConnection(uri, { dbName: `trinacria_c0_index_test_${Date.now()}` }).asPromise();
  const root = await mkdtemp(join(tmpdir(), "trinacria-index-migration-"));
  try {
    await writeFile(join(root, "index.mjs"), "// Index fixture v1\n");
    const registry = new EntityRegistry(); registerPlatformEntities(registry);
    const schema = s.object({}, { strict: false });
    registry.register({ ownerPluginId: "catalog-plugin", entityName: "items", schema, indexes: [{ fields: { id: 1 }, unique: true, name: "items_id" }] });
    const adapter = createMongoDbAdapter({ connection, entityRegistry: registry });
    await adapter.ensureIndexes("kernel", PLATFORM_ENTITIES.map(entity => entity.entityName));
    await adapter.ensureIndexes("catalog-plugin", ["items"]);
    const runner = new PluginMigrationRunner(adapter, { instanceId: "index-runner", packageRoot: root });
    const namespace = { pluginId: "catalog-plugin" };
    const old: PluginManifest = { id: namespace.pluginId, version: "1.0.0", requiresCore: "*", entities: [{ name: "items", schemaVersion: 1 }] };
    await runner.assertSchemaCompatible(old);
    const items = adapter.repository("items", namespace);
    await items.insertOne({ id: "one", code: "same" }); await items.insertOne({ id: "two", code: "same" });
    registry.register({ ownerPluginId: namespace.pluginId, entityName: "items", schema, indexes: [{ fields: { id: 1 }, unique: true, name: "items_id" }, { fields: { code: 1 }, unique: true, name: "items_code" }] });
    const definition: PluginMigrationDefinition = { id: "0001-unique-code", checksum: await computeMigrationChecksum(root, ["index.mjs"]), sourceFiles: ["index.mjs"], entities: ["items"], fromSchemaVersion: 1, toSchemaVersion: 2, kind: "index", destructive: false, idempotent: true, async run(context) { await context.ensureIndexes(["items"]); } };
    const { run, ...metadata } = definition;
    const next: PluginManifest = { ...old, version: "2.0.0", entities: [{ name: "items", schemaVersion: 2 }], migrations: [metadata] };
    await runner.maintenance.set([namespace], true, "operator");
    const options = { actorId: "operator", artifactVersion: next.version, artifactChecksum: "a".repeat(64) };
    await assert.rejects(runner.apply(next, [definition], options), /duplicate key/i);
    assert.equal((await runner.status(namespace))[0].status, "failed");
    await runner.maintenance.assertActive(namespace);
    assert.equal((await items.findMany({})).length, 2);
    await items.updateOne({ filter: { id: "two" } }, { code: "distinct" });
    await runner.apply(next, [definition], { ...options, resumeFailed: true });
    assert.equal((await runner.status(namespace))[0].status, "applied");
    await assert.rejects(items.insertOne({ id: "three", code: "same" }), /duplicate key/i);
  } finally { await connection.dropDatabase(); await connection.close(); await rm(root, { recursive: true, force: true }); }
});
