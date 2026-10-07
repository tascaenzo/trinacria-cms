import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { s } from "@trinacria/schema";
import { EntityRegistry, createMongoDbAdapter, registerPlatformEntities, MongoDurableEventStore, DurableDeliveryBlockedError } from "../src/runtime/index.js";
import type { DurableEventHost, DurableDelivery, DurableOutbox } from "../src/runtime/index.js";
const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
test("durable outbox/inbox survive restart, rollback effects, lease takeover and partition blocking", { skip: !enabled }, async () => {
  const uri = "mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin";
  const dbName = `trinacria_durable_test_${Date.now()}`;
  const connections = await Promise.all([mongoose.createConnection(uri, { dbName }).asPromise(), mongoose.createConnection(uri, { dbName }).asPromise()]);
  let now = Date.now(), failAfterEffect = false, allowed = true, calls = 0, recipient = "consumer", observedID = "";
  const make = (connection: mongoose.Connection) => { const registry = new EntityRegistry(); registerPlatformEntities(registry); for (const ownerPluginId of ["producer", "consumer"]) registry.register({ ownerPluginId, entityName: "items", schema: s.object({}, { strict: false }), indexes: [{ fields: { id: 1 }, unique: true }] }); return { registry, db: createMongoDbAdapter({ connection, entityRegistry: registry }) }; };
  const first = make(connections[0]), second = make(connections[1]);
  const host: DurableEventHost = {
    async describe(ownerPluginId, eventName, payload) { return { ownerPluginId, eventName: `${ownerPluginId}:${eventName}`, payloadVersion: 1, payload, recipients: [{ consumerPluginId: recipient, handlerName: "apply", handlerVersion: "1.0.0" }] }; },
    async dispatch(delivery, outbox, db) {
      if (!allowed) throw new DurableDeliveryBlockedError("policy-denied");
      assert.throws(() => db.repository("event_inbox", { pluginId: "kernel" }), /owner mismatch/);
      observedID = outbox.id; calls++;
      await db.repository("items", { pluginId: "consumer" }).insertOne({ id: outbox.id, value: outbox.payload });
      if (failAfterEffect) throw new Error("secret token must not appear in diagnostics");
    }
  };
  const options = { now: () => now, random: () => 0, leaseMs: 1000, heartbeatMs: 500, deadlineMs: 800, maxAttempts: 2 };
  const one = new MongoDurableEventStore(first.db, first.registry, host, { ...options, instanceId: "one" });
  const two = new MongoDurableEventStore(second.db, second.registry, host, { ...options, instanceId: "two" });
  try {
    await one.initialize(); await two.initialize();
    await assert.rejects(one.transaction("producer", async (db, events) => { await db.repository("items", { pluginId: "producer" }).insertOne({ id: "rollback" }); await events.emit("ready", { item: "rollback" }); throw new Error("domain failure"); }), /domain failure/);
    assert.equal(await first.db.repository("items", { pluginId: "producer" }).findOne({ filter: { id: "rollback" } }), null);
    assert.equal((await first.db.repository("event_outbox", { pluginId: "kernel" }).findMany({})).length, 0);
    await assert.rejects(one.transaction("producer", async (db, events) => { await db.repository("items", { pluginId: "producer" }).insertOne({ id: "outbox-failure" }); await events.emit("ready", new Date()); }), /JSON/);
    assert.equal(await first.db.repository("items", { pluginId: "producer" }).findOne({ filter: { id: "outbox-failure" } }), null);
    await one.transaction("producer", async (db, events) => { await db.repository("items", { pluginId: "producer" }).insertOne({ id: "committed" }); await events.emit("ready", { item: "committed" }); });
    // Process death after commit: the other host creates the original recipient snapshot.
    recipient = "late-consumer"; await two.materialize(); assert.equal((await two.list())[0].consumerPluginId, "consumer"); recipient = "consumer";
    assert.equal(await one.materialize(), 0);
    const claims = await Promise.all([one.acquire(), two.acquire()]); assert.equal(claims.filter(Boolean).length, 1);
    const original = claims.find(Boolean)!; const worker = original.leaseOwner === "one" ? one : two;
    failAfterEffect = true; await worker.process(original);
    assert.equal(await first.db.repository("items", { pluginId: "consumer" }).findOne({ filter: { id: original.eventId } }), null);
    assert.equal((await one.get(original.id))!.reason, "handler-failed"); assert.doesNotMatch(JSON.stringify(await one.list()), /secret token/);
    now += 1001; failAfterEffect = false;
    const retry = await two.acquire(); assert.equal(retry!.eventId, original.eventId); await two.process(retry!); assert.equal(observedID, original.eventId);
    assert.equal((await one.get(original.id))!.status, "succeeded");
    await assert.rejects(one.decide(original.id, "retry", retry!.epoch, "operator", "retry"), /completed inbox/);
    const before = calls; await assert.rejects(two.process(retry!), { code: "durable_delivery_lease_lost" }); assert.equal(calls, before);
    const id1 = await one.publish("producer", "ready", { number: 1 }, { partitionKey: "aggregate" });
    const id2 = await one.publish("producer", "ready", { number: 2 }, { partitionKey: "aggregate" }); await one.materialize();
    const stale = await one.acquire(); assert.equal(stale!.eventId, id1); assert.equal(await two.acquire(), null);
    now += 1001; const takeover = await two.acquire(); assert.equal(takeover!.eventId, id1); assert.ok(takeover!.epoch > stale!.epoch);
    await assert.rejects(one.process(stale!), { code: "durable_delivery_lease_lost" }); await two.process(takeover!);
    const next = await one.acquire(); assert.equal(next!.eventId, id2); await one.process(next!);
    const deniedId = await one.publish("producer", "ready", { public: "metadata" }, { partitionKey: "revoked" }); await one.publish("producer", "ready", {}, { partitionKey: "revoked" }); await one.materialize();
    allowed = false; const denied = await one.acquire(); assert.equal(denied!.eventId, deniedId); await one.process(denied!); assert.equal((await one.get(denied!.id))!.status, "blocked"); assert.equal(await two.acquire(), null);
    allowed = true; await one.decide(denied!.id, "retry", denied!.epoch, "operator", "grant approved"); const replay = await two.acquire(); await two.process(replay!); await one.process((await one.acquire())!);
    failAfterEffect = true; await one.publish("producer", "ready", {}); await one.materialize(); const bad = await one.acquire(); await one.process(bad!); now += 1001; const bad2 = await two.acquire(); await two.process(bad2!); assert.equal((await one.get(bad!.id))!.status, "dead-letter");
    const inbox = await first.db.repository("event_inbox", { pluginId: "kernel" }).findMany({}); assert.ok(inbox.every((row: any) => row.purgeAt instanceof Date));
    const audit = await first.db.repository("platform_audit", { pluginId: "kernel" }).findMany({}); assert.equal(audit.length, 1); assert.doesNotMatch(JSON.stringify(audit), /secret token/);
  } finally { await Promise.allSettled([one.close(), two.close()]); await connections[0].dropDatabase(); await Promise.all(connections.map(c => c.close())); }
});

test("durable dispatch rechecks runtime policy/generation and uses the transaction-bound plugin storage", { skip: !enabled }, async () => {
  const { TrinacriaApp, valueProvider } = await import("@trinacria/core");
  const { createEventsPlugin, EVENT_BUS_TOKEN } = await import("@trinacria/events");
  const { InMemoryPluginRuntime } = await import("../src/runtime/index.js");
  const { CORE_TOKENS } = await import("../src/tokens/core-tokens.js");
  const connection = await mongoose.createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", { dbName: `trinacria_durable_runtime_${Date.now()}` }).asPromise();
  const registry = new EntityRegistry(); registerPlatformEntities(registry); registry.register({ ownerPluginId: "consumer", entityName: "items", schema: s.object({}, { strict: false }) });
  const db = createMongoDbAdapter({ connection, entityRegistry: registry }), app = new TrinacriaApp(); app.use(createEventsPlugin()); app.registerGlobalProvider(valueProvider(CORE_TOKENS.DB_ADAPTER, db)); await app.start();
  let allowed = true, local = 0, called = 0;
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app, eventSubscriptionAuthorizer: { canSubscribe: () => ({ allowed }) } });
  const store = new MongoDurableEventStore(db, registry, {
    describe: (owner, name, payload) => runtime.describeDurablePublication(owner, name, payload),
    assertConsumerActive: id => runtime.assertDurableConsumerActive(id),
    dispatch: (delivery, outbox, adapter, signal, events) => runtime.dispatchDurableEvent(delivery, outbox, adapter, signal, events)
  }, { instanceId: "runtime" });
  try {
    await runtime.register({ manifest: { id: "producer", version: "1.0.0", requiresCore: "*", events: { emits: [{ name: "ready", visibility: "protected", version: 1, delivery: "async" }] }, security: { permissions: [{ key: "producer:events:consume", displayName: "Consume" }] } } });
    await assert.rejects(runtime.load("producer"), /initialized Mongo/);
    await store.initialize(); runtime.setDurableEventStore(store);
    await runtime.register({ manifest: { id: "consumer", version: "1.0.0", requiresCore: "*", entities: [{ name: "items", schemaVersion: 1 }], events: { subscribes: [{ eventName: "producer:ready", handler: "apply", requiredPermission: "producer:events:consume" }] } }, eventHandlers: { async apply(payload, envelope, context) { called++; assert.equal(context.pluginId, "consumer"); await context.services.storage.repository("items").insertOne({ id: envelope.id, payload }); await assert.rejects(context.services.storage.transaction(async () => null), /Nested/); await assert.rejects(context.services.operations.call("producer", "send", {}), /external effects/); } } });
    await runtime.loadMany(); const bus = await app.resolve(EVENT_BUS_TOKEN); const off = bus.on("producer:ready", () => { local++; });
    await runtime.emitPluginEvent("producer", "ready", { item: "first" }); assert.equal(local, 0); assert.equal(called, 0); await store.materialize(); const first = await store.acquire(); allowed = false; await store.process(first!); assert.equal(called, 0); assert.equal((await store.get(first!.id))!.status, "blocked");
    allowed = true; await store.decide(first!.id, "retry", first!.epoch, "operator", "grant approved"); await store.process((await store.acquire())!); assert.equal(called, 1); assert.equal((await db.repository("items", { pluginId: "consumer" }).findMany({})).length, 1);
    await runtime.emitPluginEvent("producer", "ready", {}); await store.materialize(); const second = await store.acquire(); await runtime.disable("consumer"); await store.process(second!); assert.equal((await store.get(second!.id))!.status, "blocked"); assert.equal(called, 1); off();
  } finally { await store.close(); await app.shutdown(); await connection.dropDatabase(); await connection.close(); }
});

test("deadline abort is cooperative: keep the lease until handler returns and roll back its effects", { skip: !enabled }, async () => {
  const connection = await mongoose.createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", { dbName: `trinacria_durable_deadline_${Date.now()}` }).asPromise();
  const registry = new EntityRegistry(); registerPlatformEntities(registry); registry.register({ ownerPluginId: "consumer", entityName: "items", schema: s.object({}, { strict: false }) });
  const db = createMongoDbAdapter({ connection, entityRegistry: registry });
  let release!: () => void; const waiting = new Promise<void>(resolve => { release = resolve; });
  let arrived!: () => void; const arrival = new Promise<void>(resolve => { arrived = resolve; });
  let observedSignal: AbortSignal | undefined;
  const store = new MongoDurableEventStore(db, registry, {
    async describe(ownerPluginId, name, payload) { return { ownerPluginId, eventName: `${ownerPluginId}:${name}`, payloadVersion: 1, payload, recipients: [{ consumerPluginId: "consumer", handlerName: "apply", handlerVersion: "1.0.0" }] }; },
    async dispatch(delivery, outbox, adapter, signal) { observedSignal = signal; arrived(); await waiting; await adapter.repository("items", { pluginId: "consumer" }).insertOne({ id: outbox.id }); }
  }, { instanceId: "deadline", deadlineMs: 10, heartbeatMs: 50, leaseMs: 150 });
  try {
    await store.initialize(); await store.publish("producer", "ready", {}); await store.publish("producer", "ready", {}); await store.materialize();
    const delivery = await store.acquire(); const processing = store.process(delivery!); await arrival;
    await new Promise(resolve => setTimeout(resolve, 25)); assert.equal(observedSignal!.aborted, true); assert.equal(await store.acquire(), null); assert.equal((await store.get(delivery!.id))!.status, "running");
    release(); await assert.rejects(processing, /deadline/); assert.equal((await db.repository("items", { pluginId: "consumer" }).findMany({})).length, 0); assert.equal(store.metrics.deadlineExceeded, 1);
  } finally { release(); await store.close(); await connection.dropDatabase(); await connection.close(); }
});
