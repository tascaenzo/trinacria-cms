import assert from "node:assert/strict";
import test from "node:test";
import { s } from "@trinacria/schema";
import { buildPhysicalCollectionName, EntityRegistry, MongoStorageOwnershipStore } from "../src/runtime/index.js";

test("physical names preserve distinctions between owner, workspace and entity tuples", () => {
  const tuples = [
    [{ pluginId: "a-b" }, "items"], [{ pluginId: "a_b" }, "items"],
    [{ pluginId: "a-b", workspaceId: "a-b" }, "items"], [{ pluginId: "a-b", workspaceId: "a_b" }, "items"],
    [{ pluginId: "a-b" }, "item-s"], [{ pluginId: "a-b" }, "item_s"],
    [{ pluginId: "a-b", workspaceId: "x:workspace:y" }, "items"], [{ pluginId: "a-b", workspaceId: "x" }, "workspace:y:items"],
    [{ pluginId: "a-b" }, "items__plugin_a-b"], [{ pluginId: "a-b" }, "items%5F%5Fplugin_a-b"],
    [{ pluginId: "a-b__workspace_x" }, "items"], [{ pluginId: "a-b", workspaceId: "x" }, "items"],
    [{ pluginId: "a-b", workspaceId: "x__workspace_y" }, "items"],
    [{ pluginId: "a-b" }, "system.users"], [{ pluginId: "a-b" }, "system%2Eusers"]
  ] as const;
  const names = tuples.map(([namespace, entity]) => buildPhysicalCollectionName(namespace, entity));
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((name) => name.includes("__plugin_") && !name.startsWith("v2_")));
  assert.throws(() => buildPhysicalCollectionName({ pluginId: "Upper" }, "items"), /canonical/);
});
test("collection names expose entity, plugin and optional workspace", () => {
  assert.equal(buildPhysicalCollectionName({ pluginId: "core-pack" }, "users"), "users__plugin_core-pack");
  assert.equal(buildPhysicalCollectionName({ pluginId: "core-pack" }, "local_credentials"), "local_credentials__plugin_core-pack");
  assert.equal(buildPhysicalCollectionName({ pluginId: "editorial-pack" }, "entries"), "entries__plugin_editorial-pack");
  assert.equal(buildPhysicalCollectionName({ pluginId: "kernel" }, "storage_ownership"), "storage_ownership__plugin_kernel");
  assert.equal(buildPhysicalCollectionName({ pluginId: "media-pack", workspaceId: "team-1" }, "assets"), "assets__plugin_media-pack__workspace_team-1");
  assert.equal(buildPhysicalCollectionName({ pluginId: "vendor/plugin", workspaceId: "team:a" }, "items"), "items__plugin_vendor%2Fplugin__workspace_team%3Aa");
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
