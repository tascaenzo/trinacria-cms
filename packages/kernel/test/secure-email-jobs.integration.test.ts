import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import { EntityRegistry, createMongoDbAdapter, registerPlatformEntities, HostUnitOfWork, SecureEventPayloadCrypto, SecureEventPayloadsRepository, SecureEventPayloadsService, SECURE_EVENT_PAYLOADS_ENTITY, SecureEmailJobStore } from "../src/runtime/index.js";
import type { DurableDelivery, SecureEmailJobHost } from "../src/runtime/index.js";
const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
test("vault-to-email job is atomic, encrypted, single-use and never silently resends ambiguous SMTP", { skip: !enabled }, async () => {
  const connection = await mongoose.createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", { dbName: `trinacria_secure_jobs_${Date.now()}` }).asPromise();
  const registry = new EntityRegistry(); registerPlatformEntities(registry); registry.register(SECURE_EVENT_PAYLOADS_ENTITY);
  const db = createMongoDbAdapter({ connection, entityRegistry: registry }), uow = new HostUnitOfWork(db);
  let now = Date.now(), allowed = true, sends = 0, providerFails = false;
  const originalKey = randomBytes(32);
  const crypto = new SecureEventPayloadCrypto({ activeKeyId: "v1", keys: { v1: originalKey } });
  const vault = new SecureEventPayloadsService(new SecureEventPayloadsRepository(db), crypto, { canClaim: () => ({ allowed }) }, { now: () => new Date(now) });
  const host: SecureEmailJobHost = { async canSend() { return allowed; }, async send(payload, context) { sends++; assert.match(context.messageId, /^<[a-f0-9]{64}@trinacria.invalid>$/); assert.equal((payload as any).token, "secret-not-in-outbox"); if (providerFails) throw new Error("SMTP uncertain secret-not-in-outbox"); } };
  const one = new SecureEmailJobStore(db, registry, vault, crypto, host, { instanceId: "one", now: () => now, leaseMs: 1000 });
  const two = new SecureEmailJobStore(db, registry, vault, crypto, host, { instanceId: "two", now: () => now, leaseMs: 1000 });
  const create = () => vault.forPlugin("producer").create({ eventName: "producer:ready", payloadType: "email-pack:send-email-request", schemaVersion: 1, requiredPermission: "email-pack:email:send", authorizedConsumerPluginIds: ["email-pack"], expiresAt: new Date(now + 10000), payload: { token: "secret-not-in-outbox", to: "private@example.test" } });
  const delivery = (eventId: string): DurableDelivery => ({ id: eventId, eventId, eventName: "producer:ready", ownerPluginId: "producer", consumerPluginId: "email-pack", handlerName: "deliver", handlerVersion: "1.0.0", payloadVersion: 1, status: "running", epoch: 1, attempt: 1, createdAt: new Date(now), availableAt: new Date(now) });
  const input = (payloadId: string) => ({ payloadId, eventName: "producer:ready", payloadType: "email-pack:send-email-request", schemaVersion: 1, requiredPermission: "email-pack:email:send" });
  try {
    await one.initialize(); await two.initialize(); await db.ensureIndexes("kernel", ["secure_event_payloads"]);
    const record = await create();
    await one.preflightClaim(delivery("first"), input(record.id));
    await assert.rejects(uow.run([{ pluginId: "kernel" }], async r => { await one.transfer(r, delivery("first"), input(record.id)); throw new Error("crash before job commit"); }), /crash/);
    assert.equal((await new SecureEventPayloadsRepository(db).findById(record.id))!.claimCount, 0); assert.equal((await one.list()).length, 0);
    await uow.run([{ pluginId: "kernel" }], r => one.transfer(r, delivery("first"), input(record.id)));
    await uow.run([{ pluginId: "kernel" }], r => two.transfer(r, delivery("first"), input(record.id)));
    assert.equal((await one.list()).length, 1); assert.equal((await new SecureEventPayloadsRepository(db).findById(record.id))!.claimCount, 1);
    const stored = await db.repository("secure_email_jobs", { pluginId: "kernel" }).findMany({}); assert.doesNotMatch(JSON.stringify(stored), /secret-not-in-outbox|private@example/); assert.doesNotMatch(JSON.stringify(await one.list()), /cipherText|payloadId/);
    const acquired = await Promise.all([one.acquire(), two.acquire()]); assert.equal(acquired.filter(Boolean).length, 1); const job = acquired.find(Boolean)!; await (job.leaseOwner === "one" ? one : two).process(job); assert.equal(sends, 1);
    const second = await create(); await uow.run([{ pluginId: "kernel" }], r => one.transfer(r, delivery("second"), input(second.id)));
    const expiredLease = await one.acquire(); now += 1001; assert.equal(await two.acquire(), null); assert.equal((await one.list()).find(row => row.eventId === "second")!.status, "ambiguous"); await one.process(expiredLease!); assert.equal(sends, 1);
    const third = await create(); await uow.run([{ pluginId: "kernel" }], r => one.transfer(r, delivery("third"), input(third.id))); allowed = false; assert.equal(await two.acquire(), null); assert.equal((await one.list()).find(row => row.eventId === "third")!.status, "blocked"); allowed = true;
    const fourth = await create(); await uow.run([{ pluginId: "kernel" }], r => one.transfer(r, delivery("fourth"), input(fourth.id))); now += 10001; assert.equal(await two.acquire(), null); assert.equal((await one.list()).find(row => row.eventId === "fourth")!.status, "cancelled");
    const fifth = await create(); await uow.run([{ pluginId: "kernel" }], r => one.transfer(r, delivery("fifth"), input(fifth.id))); providerFails = true; await two.process((await two.acquire())!); assert.equal((await one.list()).find(row => row.eventId === "fifth")!.status, "ambiguous"); assert.equal(sends, 2); assert.equal(await one.acquire(), null);
    assert.doesNotMatch(JSON.stringify(await one.list()), /secret-not-in-outbox|SMTP uncertain/);
    const uncertain = (await one.list()).find(row => row.eventId === "fifth")!;
    await assert.rejects(two.decide(uncertain.id, uncertain.epoch - 1, "retry", "operator", "provider confirmed failure"), error => (error as any).code === "delivery_conflict");
    await two.decide(uncertain.id, uncertain.epoch, "cancel", "operator", "provider reconciliation confirmed delivery");
    assert.equal((await two.get(uncertain.id))!.status, "cancelled");
    assert.equal((await db.repository("platform_audit", { pluginId: "kernel" }).findMany({ filter: { action: "email-job.cancel" } })).length, 1);
    assert.equal(await two.get("missing"), null);
    await assert.rejects(two.list({ limit: 101 }));
    const sixth = await create(); await uow.run([{ pluginId: "kernel" }], r => one.transfer(r, delivery("sixth"), input(sixth.id)));
    // Include enough time for real Mongo preflight under concurrent integration
    // load; this case exercises timeout AFTER the provider has started sending.
    let deadlineProviderStarted = false;
    const held = new SecureEmailJobStore(db, registry, vault, crypto, { async canSend() { return true; }, async send(_payload, context) { deadlineProviderStarted = true; await new Promise<void>((_resolve, reject) => { context.signal.addEventListener("abort", () => reject(new Error("provider deadline")), { once: true }); }); } }, { instanceId: "deadline", now: () => now, leaseMs: 1000, deadlineMs: 2000 });
    await held.process((await held.acquire())!);
    assert.equal(deadlineProviderStarted, true);
    assert.equal((await held.list()).find(row => row.eventId === "sixth")!.status, "ambiguous");
    assert.equal(held.metrics.deadlines, 1); assert.equal(await held.acquire(), null); await held.close();
    const rotated = new SecureEventPayloadCrypto({ activeKeyId: "v2", keys: { v1: originalKey, v2: randomBytes(32) } });
    const rotation = new SecureEmailJobStore(db, registry, vault, rotated, host, { instanceId: "rotation", now: () => now });
    const before = await one.list();
    const report = await rotation.reencryptBatch("v1"); assert.ok(report.changed > 0);
    assert.deepEqual(await rotation.list(), before);
    const after = await db.repository("secure_email_jobs", { pluginId: "kernel" }).findMany({});
    assert.ok(after.every(row => (row as any).encryptedPayload.keyVersion === "v2"));
    assert.equal((await new SecureEventPayloadsRepository(db).findById(record.id))!.claimCount, 1);
    await rotation.close();

  } finally { await Promise.allSettled([one.close(), two.close()]); await connection.dropDatabase(); await connection.close(); }
});
