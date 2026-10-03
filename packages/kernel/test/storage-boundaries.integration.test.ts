import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { s } from "@trinacria/schema";
import { createMongoDbAdapter, EntityRegistry, HostUnitOfWork, buildPhysicalCollectionName, STORAGE_OWNERSHIP_COLLECTION } from "../src/runtime/index.js";

const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
const uri = process.env.TRINACRIA_MONGO_URI ?? process.env.MONGO_URI ?? "mongodb://trinacria:trinacria@127.0.0.1:27017/trinacria_cms?authSource=admin";
test("owned Mongo storage and host unit of work enforce isolation and atomic rollback", { skip: !enabled }, async () => {
  const connection = await mongoose.createConnection(uri, { dbName: `trinacria_a0_test_${Date.now()}` }).asPromise();
  try {
    const registry = new EntityRegistry();
    const schema = s.object({ id: s.string() });
    for (const ownerPluginId of ["a-b", "a_b", "kernel"]) registry.register({ ownerPluginId, entityName: "items", schema, indexes: [{ fields: { id: 1 }, unique: true }] });
    registry.register({ ownerPluginId: "a-b", entityName: "private", schema });
    const adapter = createMongoDbAdapter({ connection, entityRegistry: registry });
    for (const owner of ["a-b", "a_b", "kernel"]) await adapter.ensureIndexes(owner, ["items"]);
    const first = adapter.repository("items", { pluginId: "a-b" });
    const second = adapter.repository("items", { pluginId: "a_b" });
    await first.insertOne({ id: "first" }); await second.insertOne({ id: "second" });
    assert.deepEqual((await first.findMany({})).map((item: any) => item.id), ["first"]);
    assert.deepEqual((await second.findMany({})).map((item: any) => item.id), ["second"]);
    assert.throws(() => adapter.repository("private", { pluginId: "a_b" }), /No entity definition/);
    const workspaceA = adapter.repository("items", { pluginId: "a-b", workspaceId: "a-b" });
    const workspaceB = adapter.repository("items", { pluginId: "a-b", workspaceId: "a_b" });
    await workspaceA.insertOne({ id: "workspace" }); assert.equal((await workspaceB.findMany({})).length, 0);
    const uow = new HostUnitOfWork(adapter);
    const allowlist = [{ pluginId: "a-b" }, { pluginId: "kernel" }];
    let escaped: any;
    await uow.run(allowlist, async (repos) => {
      escaped = repos.repository("items", { pluginId: "a-b" });
      await escaped.insertOne({ id: "committed" });
      await repos.repository("items", { pluginId: "kernel" }).insertOne({ id: "audit" });
      assert.throws(() => repos.repository("items", { pluginId: "a_b" }), /allowlist/);
      await assert.rejects(uow.run(allowlist, async () => null), /Nested/);
    });
    await assert.rejects(escaped.findMany({}), /scope has ended/);
    await assert.rejects(uow.run(allowlist, async (repos) => {
      await repos.repository("items", { pluginId: "a-b" }).insertOne({ id: "rolled-back" });
      await repos.repository("items", { pluginId: "kernel" }).insertOne({ id: "audit-rolled-back" });
      throw new Error("injected failure");
    }), /injected failure/);
    assert.equal(await first.findOne({ filter: { id: "rolled-back" } }), null);
    assert.equal(await adapter.repository("items", { pluginId: "kernel" }).findOne({ filter: { id: "audit-rolled-back" } }), null);
    assert.ok(await first.findOne({ filter: { id: "committed" } }));
    await adapter.withTransaction({ pluginId: "a-b" }, async (scoped) => {
      assert.throws(() => scoped.repository("items", { pluginId: "kernel" }), /allowlist/);
    });
    const mappings = await connection.collection(STORAGE_OWNERSHIP_COLLECTION).find({}).toArray();
    assert.ok(mappings.some((record) => record.physicalName === buildPhysicalCollectionName({ pluginId: "a-b" }, "items")));
    assert.equal(new Set(mappings.map((record) => record.physicalName)).size, mappings.length);
    const indices = await connection.collection(STORAGE_OWNERSHIP_COLLECTION).indexes();
    assert.equal(indices.filter((index) => index.unique).length, 2);
  } finally { await connection.dropDatabase(); await connection.close(); }
});

test("previous storage layout fails explicitly without deleting development data", { skip: !enabled }, async () => {
  const connection = await mongoose.createConnection(uri, { dbName: `trinacria_a0_old_test_${Date.now()}` }).asPromise();
  try {
    await connection.collection("kernel__installed_plugins").insertOne({ marker: "keep" });
    const adapter = createMongoDbAdapter({ connection, entityRegistry: new EntityRegistry() });
    await assert.rejects(adapter.initializeStorageOwnership(), /Previous storage layout detected/);
    assert.equal(await connection.collection("kernel__installed_plugins").countDocuments({ marker: "keep" }), 1);
  } finally { await connection.dropDatabase(); await connection.close(); }
});
