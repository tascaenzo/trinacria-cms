import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import { createMongoDbAdapter, EntityRegistry, MongoPluginNonceStore, PLUGIN_AUTH_NONCES_ENTITY } from "../src/runtime/index.js";
const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
test("two hosts and restarted host share atomic nonce consumption with real Date TTL", { skip: !enabled }, async () => {
  const uri = process.env.TRINACRIA_MONGO_URI ?? "mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin";
  const dbName = `trinacria_nonce_test_${Date.now()}`;
  const first = await mongoose.createConnection(uri, { dbName }).asPromise(); const second = await mongoose.createConnection(uri, { dbName }).asPromise();
  const registry = () => { const r = new EntityRegistry(); r.register(PLUGIN_AUTH_NONCES_ENTITY); return r; };
  const make = (connection: mongoose.Connection) => new MongoPluginNonceStore(createMongoDbAdapter({ connection, entityRegistry: registry() }));
  try {
    const hash = createHash("sha256").update("random-nonce").digest("hex"); const expiresAt = new Date(Date.now() + 600000);
    const results = await Promise.all([make(first).consume("catalog", hash, expiresAt), make(second).consume("catalog", hash, expiresAt)]);
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(await make(second).consume("catalog", hash, expiresAt), false);
    assert.equal(await make(second).consume("other-plugin", hash, expiresAt), true);
    const collections = await first.db!.listCollections().toArray(); const name = (await Promise.all(collections.map(async c => ({ name: c.name, indexes: await first.db!.collection(c.name).indexes() })))).find(c => c.indexes.some(i => i.name === "plugin_auth_nonces_expiry"))!.name; const collection = first.db!.collection(name);
    assert.ok((await collection.findOne({ pluginId: "catalog" }))!.expiresAt instanceof Date);
    const indexes = await collection.indexes(); assert.equal(indexes.find(i => i.name === "plugin_auth_nonces_expiry")!.expireAfterSeconds, 0);
    assert.equal(indexes.find(i => i.name === "plugin_auth_nonces_identity")!.unique, true);
    // Delayed TTL deletion never enables replay: an expired physical record still rejects.
    await collection.updateOne({ pluginId: "catalog" }, { $set: { expiresAt: new Date(0) } });
    assert.equal(await make(second).consume("catalog", hash, expiresAt), false);
  } finally { await first.dropDatabase(); await first.close(); await second.close(); }
});
