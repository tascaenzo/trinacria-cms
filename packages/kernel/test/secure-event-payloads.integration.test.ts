import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { EntityRegistry, createMongoDbAdapter, SecureEventPayloadCrypto, SecureEventPayloadsRepository, SecureEventPayloadsService, SECURE_EVENT_PAYLOADS_ENTITY } from "../src/runtime/index.js";
const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
const uri = process.env.TRINACRIA_MONGO_URI ?? process.env.MONGO_URI ?? "mongodb://trinacria:trinacria@127.0.0.1:27017/trinacria_cms?authSource=admin";

for (const maxClaims of [1, 3]) test(`50 concurrent vault claims across two services allow exactly ${maxClaims} successes`, { skip: !enabled }, async () => {
  const dbName = `trinacria_vault_a2_${maxClaims}_${Date.now()}`;
  const connections = await Promise.all([mongoose.createConnection(uri, { dbName }).asPromise(), mongoose.createConnection(uri, { dbName }).asPromise()]);
  try {
    let arrivals = 0; let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const policy = { async canClaim() { if (arrivals < 50) { arrivals++; if (arrivals === 50) release(); await barrier; } return { allowed: true }; } };
    const keyring = { activeKeyId: "test-v1", keys: { "test-v1": randomBytes(32) } };
    const services = connections.map((connection) => {
      const registry = new EntityRegistry(); registry.register(SECURE_EVENT_PAYLOADS_ENTITY);
      const adapter = createMongoDbAdapter({ connection, entityRegistry: registry });
      return new SecureEventPayloadsService(new SecureEventPayloadsRepository(adapter), new SecureEventPayloadCrypto(keyring), policy);
    });
    const record = await services[0]!.forPlugin("producer").create({ eventName: "producer:ready", payloadType: "consumer:message", schemaVersion: 1, requiredPermission: "producer:payload:read", payload: { token: "must-be-single-use" }, maxClaims, authorizedConsumerPluginIds: ["consumer"] });
    const results = await Promise.allSettled(Array.from({ length: 50 }, (_, index) => services[index % 2]!.forPlugin("consumer").claim({ payloadId: record.id, eventName: "producer:ready", payloadType: "consumer:message", schemaVersion: 1, requiredPermission: "producer:payload:read" })));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, maxClaims);
  } finally { await connections[0]!.dropDatabase(); await Promise.all(connections.map((connection) => connection.close())); }
});

function gate() {
  let release!: () => void; let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  return { ready, release: () => release(), async wait() { started(); await waiting; return { allowed: true }; } };
}
async function setup(t: test.TestContext) {
  const dbName = `trinacria_vault_a2_edges_${Date.now()}`;
  const connections = await Promise.all([mongoose.createConnection(uri, { dbName }).asPromise(), mongoose.createConnection(uri, { dbName }).asPromise()]);
  t.after(async () => { await connections[0]!.dropDatabase(); await Promise.all(connections.map((connection) => connection.close())); });
  const keyring = { activeKeyId: "v1", keys: { v1: randomBytes(32), v2: randomBytes(32) } };
  const repositories = connections.map((connection) => {
    const registry = new EntityRegistry(); registry.register(SECURE_EVENT_PAYLOADS_ENTITY);
    return new SecureEventPayloadsRepository(createMongoDbAdapter({ connection, entityRegistry: registry }));
  });
  await Promise.all(repositories.map((repo) => repo.initialize()));
  let now = new Date();
  const clock = () => now;
  const host = (index: number, policy: any = { canClaim: () => ({ allowed: true }) }, activeKeyId = "v1") => new SecureEventPayloadsService(repositories[index]!, new SecureEventPayloadCrypto({ ...keyring, activeKeyId }), policy, { now: clock, retentionMs: 86_400_000 });
  return { connections, repositories, keyring, host, advance(ms: number) { now = new Date(now.getTime() + ms); }, clock };
}
const createInput = { eventName: "producer:ready", payloadType: "consumer:message", schemaVersion: 1, requiredPermission: "producer:payload:read", payload: { token: "secret-must-not-leak" }, authorizedConsumerPluginIds: ["consumer"] };
const claimInput = { eventName: "producer:ready", payloadType: "consumer:message", schemaVersion: 1, requiredPermission: "producer:payload:read" };
const errorCode = (code: string) => (error: any) => { assert.equal(error.code, code); assert.equal(JSON.stringify(error).includes("secret-must-not-leak"), false); return true; };

test("Mongo claim/revoke linearization never revives a terminal payload", { skip: !enabled }, async (t) => {
  const f = await setup(t); const producer = f.host(0).forPlugin("producer"); const suspended = gate();
  const consumer = f.host(1, { canClaim: () => suspended.wait() }).forPlugin("consumer");
  const first = await producer.create(createInput); const pending = consumer.claim({ ...claimInput, payloadId: first.id });
  await suspended.ready; await producer.revoke(first.id); suspended.release();
  await assert.rejects(pending, errorCode("secure_event_payload_claim_denied"));
  assert.equal((await f.repositories[1]!.findById(first.id))?.claimCount, 0);
  assert.equal((await f.repositories[1]!.findById(first.id))?.status, "revoked");
  const second = await producer.create(createInput);
  await f.host(1).forPlugin("consumer").claim({ ...claimInput, payloadId: second.id });
  assert.equal((await producer.revoke(second.id)).status, "consumed");
  await assert.rejects(f.host(1).forPlugin("consumer").claim({ ...claimInput, payloadId: second.id }), errorCode("secure_event_payload_claim_denied"));
});

test("Mongo claim checks fresh expiry after policy, rejects structural bypass and corrupt ciphertext", { skip: !enabled }, async (t) => {
  const f = await setup(t); const producer = f.host(0).forPlugin("producer"); const suspended = gate();
  const expiring = await producer.create({ ...createInput, expiresAt: new Date(f.clock().getTime() + 1000) });
  const pending = f.host(1, { canClaim: () => suspended.wait() }).forPlugin("consumer").claim({ ...claimInput, payloadId: expiring.id });
  await suspended.ready; f.advance(1000); suspended.release();
  await assert.rejects(pending, errorCode("secure_event_payload_claim_denied"));
  const expired = await f.repositories[0]!.findById(expiring.id); assert.equal(expired?.status, "expired"); assert.equal(expired?.claimCount, 0);
  let evaluations = 0;
  await assert.rejects(f.host(1, { canClaim() { evaluations++; return { allowed: true }; } }).forPlugin("foreign").claim({ ...claimInput, payloadId: expiring.id }), errorCode("secure_event_payload_claim_denied"));
  assert.equal(evaluations, 0);
  const corrupt = await producer.create(createInput);
  const { buildPhysicalCollectionName } = await import("../src/runtime/index.js");
  await f.connections[0]!.collection(buildPhysicalCollectionName({ pluginId: "kernel" }, "secure_event_payloads")).updateOne({ id: corrupt.id }, { $set: { "encryptedPayload.authTag": Buffer.alloc(16).toString("base64") } });
  await assert.rejects(f.host(1).forPlugin("consumer").claim({ ...claimInput, payloadId: corrupt.id }), errorCode("secure_event_payload_invalid_ciphertext"));
  assert.equal((await f.repositories[0]!.findById(corrupt.id))?.claimCount, 0);
});

test("Mongo key rotation races with claim safely and uses real BSON Date retention TTL", { skip: !enabled }, async (t) => {
  const f = await setup(t); const first = f.host(0); const rotating = f.host(1, undefined, "v2");
  const record = await first.forPlugin("producer").create({ ...createInput, maxClaims: 3 });
  const suspended = gate(); let evaluations = 0;
  const pending = f.host(0, { async canClaim() { if (++evaluations === 1) return suspended.wait(); return { allowed: true }; } }).forPlugin("consumer").claim({ ...claimInput, payloadId: record.id });
  await suspended.ready; assert.equal((await rotating.reencrypt(record.id)).changed, true); suspended.release();
  const claimed = await pending; assert.deepEqual(claimed.payload, createInput.payload); assert.equal(claimed.record.claimCount, 1); assert.equal(evaluations, 2);
  const active = await rotating.forPlugin("producer").create(createInput);
  await rotating.forPlugin("consumer").claim({ ...claimInput, payloadId: active.id });
  const consumed = await f.repositories[0]!.findById(active.id);
  assert.ok(consumed?.purgeAt instanceof Date); assert.equal(consumed.purgeAt.getTime(), f.clock().getTime() + 86_400_000);
  const { buildPhysicalCollectionName } = await import("../src/runtime/index.js");
  const indexes = await f.connections[0]!.collection(buildPhysicalCollectionName({ pluginId: "kernel" }, "secure_event_payloads")).indexes();
  assert.equal(indexes.find((index) => index.name === "secure_event_payloads_retention_ttl")?.expireAfterSeconds, 0);
  const v2only = new SecureEventPayloadCrypto({ activeKeyId: "v2", keys: { v2: f.keyring.keys.v2 } });
  assert.deepEqual(JSON.parse(v2only.decrypt(consumed.encryptedPayload)), createInput.payload);
  assert.throws(() => v2only.decrypt(new SecureEventPayloadCrypto(f.keyring).encrypt("{}")), errorCode("secure_event_payload_key_unavailable"));
});

test("rotation command inventories without writes and applies resumable CAS batches", { skip: !enabled }, async (t) => {
  const f = await setup(t); const producer = f.host(0).forPlugin("producer");
  const first = await producer.create(createInput); const second = await producer.create(createInput);
  await f.host(0).forPlugin("consumer").claim({ ...claimInput, payloadId: second.id });
  const { buildPhysicalCollectionName, STORAGE_OWNERSHIP_COLLECTION } = await import("../src/runtime/index.js");
  const collection = f.connections[0]!.collection(buildPhysicalCollectionName({ pluginId: "kernel" }, "secure_event_payloads"));
  const before = await collection.find({}).sort({ id: 1 }).toArray();
  const mappingsBefore = await f.connections[0]!.collection(STORAGE_OWNERSHIP_COLLECTION).find({}).toArray();
  const { promisify } = await import("node:util"); const { execFile } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const command = fileURLToPath(new URL("../../../scripts/rotate-secure-payloads.mjs", import.meta.url));
  const address = new URL(uri); address.pathname = `/${f.connections[0]!.name}`;
  const env = { ...process.env, MONGO_URI: address.toString(), CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID: "v2", CMS_SECURE_PAYLOAD_KEYS_JSON: JSON.stringify({ v1: f.keyring.keys.v1.toString("base64"), v2: f.keyring.keys.v2.toString("base64") }) };
  const execute = promisify(execFile);
  const inventory = await execute(process.execPath, [command, "--from-key-id", "v1"], { env });
  assert.equal(JSON.parse(inventory.stdout).recordsUsingSourceKey, 2);
  assert.deepEqual(await collection.find({}).sort({ id: 1 }).toArray(), before);
  assert.deepEqual(await f.connections[0]!.collection(STORAGE_OWNERSHIP_COLLECTION).find({}).toArray(), mappingsBefore);
  const apply = await execute(process.execPath, [command, "--from-key-id", "v1", "--apply"], { env });
  assert.equal(JSON.parse(apply.stdout.trim().split("\n").at(-1)!).recordsUsingSourceKey, 0);
  const after = await collection.find({}).sort({ id: 1 }).toArray();
  assert.ok(after.every((row) => row.encryptedPayload.keyVersion === "v2"));
  assert.deepEqual(after.map((row) => [row.id, row.status, row.claimCount, row.purgeAt]), before.map((row) => [row.id, row.status, row.claimCount, row.purgeAt]));
  assert.equal(after.find((row) => row.id === first.id)?.status, "available");
  const repeat = await execute(process.execPath, [command, "--from-key-id", "v1", "--apply"], { env });
  assert.equal(JSON.parse(repeat.stdout.trim().split("\n").at(-1)!).changed, 0);
});
