import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import { CORE_TOKENS, valueProvider } from "@trinacria-cms/kernel";
import type { PluginHostServices } from "@trinacria-cms/kernel/contracts";
import { buildPhysicalCollectionName, createInMemoryPluginRuntimeStore, createMongoDbAdapter, EntityRegistry, startCmsApp, type MongoDbAdapterOptions } from "@trinacria-cms/kernel/runtime";
import { createCatalogPlugin } from "../../../examples/catalog-plugin/src/index.js";
import { createCatalogConsumer } from "../../../examples/catalog-consumer/src/index.js";
import { createCorePackPlugin } from "@trinacria-cms/core-pack";
import { PluginGrantsRepository } from "../src/modules/settings/plugin-access/plugin-grants.repository.js";

test("standard Mongo host supports protected events and domain calls with zero grant database commands", { skip: process.env.TRINACRIA_RUN_MONGO_INTEGRATION !== "1" }, async () => {
  process.env.CMS_JWT_SECRET = randomBytes(48).toString("hex");
  process.env.CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID = "trusted-test";
  process.env.CMS_SECURE_PAYLOAD_KEYS_JSON = JSON.stringify({ "trusted-test": randomBytes(32).toString("base64") });
  const connection = await mongoose.createConnection(process.env.MONGO_URI ?? "mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", { dbName: `trinacria_trusted_${randomUUID().replaceAll("-", "")}`, monitorCommands: true }).asPromise();
  const registry = new EntityRegistry(), db = createMongoDbAdapter({ connection: connection as unknown as MongoDbAdapterOptions["connection"], entityRegistry: registry });
  const catalog = createCatalogPlugin(), consumer = createCatalogConsumer();
  let catalogServices!: PluginHostServices, consumerServices!: PluginHostServices;
  const catalogLoad = catalog.onLoad!, consumerLoad = consumer.onLoad!;
  catalog.onLoad = async context => { await catalogLoad(context); catalogServices = context.services; };
  consumer.onLoad = async context => { await consumerLoad(context); consumerServices = context.services; };
  let handle: Awaited<ReturnType<typeof startCmsApp>> | undefined;
  const collection = buildPhysicalCollectionName({ pluginId: "core-pack" }, "plugin_access_grants");
  let grantCommands = 0;
  const observe = ({ command }: { command: Record<string, unknown> }) => {
    if (Object.values(command).includes(collection)) grantCommands++;
  };
  try {
    handle = await startCmsApp({ coreVersion: "0.1.0", plugins: [createCorePackPlugin(), catalog, consumer], globalProviders: [valueProvider(CORE_TOKENS.DB_ADAPTER, db), valueProvider(CORE_TOKENS.ENTITY_REGISTRY, registry)], pluginRuntimeStore: createInMemoryPluginRuntimeStore(), durableEvents: { pollMs: 20 }, http: { host: "127.0.0.1", port: 0 } });
    const grants = new PluginGrantsRepository(db);
    assert.deepEqual(await grants.list(), []);
    connection.getClient().on("commandStarted", observe);
    const item = { id: "sample", name: "Item", priceCents: 100, version: 1, createdAt: new Date().toISOString() };
    await catalogServices.storage.transaction(async (storage, events) => {
      await storage.repository("items").insertOne(item);
      await events.emit("catalog-plugin:item-created", { id: item.id, version: 1 }, { partitionKey: item.id });
    });
    for (let i = 0; i < 10; i++)
      assert.equal((await consumerServices.operations.call<{ id: string }>("catalog-consumer", "inspect", { id: item.id })).id, item.id);
    const deadline = Date.now() + 10000;
    let observed = false;
    while (Date.now() < deadline) {
      if (await db.repository("observations", { pluginId: "catalog-consumer" }).findOne({ filter: { itemId: item.id } })) { observed = true; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(observed, true, "durable consumer committed its owned observation");
    assert.equal(grantCommands, 0);
    connection.getClient().off("commandStarted", observe);
    assert.deepEqual(await grants.list(), []);
    const old = consumerServices;
    await handle.runtime.disable("catalog-consumer", "operator request");
    await assert.rejects(old.operations.call("catalog-consumer", "inspect", { id: item.id }));
    await handle.runtime.enable("catalog-consumer"); await handle.runtime.load("catalog-consumer");
    await assert.rejects(old.operations.call("catalog-consumer", "inspect", { id: item.id }));
    assert.equal((await consumerServices.operations.call<{ id: string }>("catalog-consumer", "inspect", { id: item.id })).id, item.id);
    console.log("TRUSTED_HOST_PROOF: 10 cross-plugin reads and protected durable delivery; 0 grant database commands, 0 approval records");
  } finally {
    connection.getClient().off("commandStarted", observe);
    try { await handle?.shutdown(); }
    finally { try { await connection.dropDatabase(); } finally { await connection.close(); } }
  }
});
