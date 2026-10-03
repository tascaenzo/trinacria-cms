import assert from "node:assert/strict";
import test from "node:test";
import { s } from "@trinacria/schema";
import { buildPhysicalCollectionName, EntityRegistry, MongoStorageOwnershipStore } from "../src/runtime/index.js";

test("physical names preserve distinctions between owner, workspace and entity tuples", () => {
  const tuples = [
    [{ pluginId: "a-b" }, "items"], [{ pluginId: "a_b" }, "items"],
    [{ pluginId: "a-b", workspaceId: "a-b" }, "items"], [{ pluginId: "a-b", workspaceId: "a_b" }, "items"],
    [{ pluginId: "a-b" }, "item-s"], [{ pluginId: "a-b" }, "item_s"],
    [{ pluginId: "a-b", workspaceId: "x:workspace:y" }, "items"], [{ pluginId: "a-b", workspaceId: "x" }, "workspace:y:items"]
  ] as const;
  const names = tuples.map(([namespace, entity]) => buildPhysicalCollectionName(namespace, entity));
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((name) => /^v2_[a-f0-9]{64}$/.test(name)));
  assert.throws(() => buildPhysicalCollectionName({ pluginId: "Upper" }, "items"), /canonical/);
});
test("entity registration requires a canonical owner and prevents schema overwrite", () => {
  const registry = new EntityRegistry();
  const schema = s.object({ id: s.string() });
  registry.register({ ownerPluginId: "first", entityName: "items", schema });
  registry.register({ ownerPluginId: "second", entityName: "items", schema });
  assert.equal(registry.get("items", "first").ownerPluginId, "first");
  assert.throws(() => registry.get("items", "third"), /No entity/);
  assert.throws(() => registry.register({ ownerPluginId: "first", entityName: "items", schema: s.object({}) }), /already registered/);
  assert.throws(() => registry.register({ ownerPluginId: "", entityName: "items", schema }), /owner/);
});
test("persistent ownership rejects a mismatched mapping instead of adopting another collection", async () => {
  const store = new MongoStorageOwnershipStore({ async createIndexes() {}, async updateOne() {},
    async findOne() { return { canonicalTuple: "wrong", physicalName: "foreign" }; } });
  await assert.rejects(store.ensure({ pluginId: "first" }, "items"), /conflicts/);
});

test("ownership indexes are initialized again after a database reconnect", async () => {
  let database = {};
  let count = 0;
  const collection = { async createIndexes() { count++; }, async updateOne() {}, async findOne() { return null; } };
  const store = new MongoStorageOwnershipStore(() => collection, () => database);
  await store.initialize(); await store.initialize();
  assert.equal(count, 1);
  database = {};
  await store.initialize();
  assert.equal(count, 2);
});
