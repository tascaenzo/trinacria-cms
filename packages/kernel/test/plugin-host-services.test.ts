import assert from "node:assert/strict";
import test from "node:test";
import { TrinacriaApp, createToken, valueProvider, defineModule } from "@trinacria/core";
import { s } from "@trinacria/schema";
import type { PluginHostServices, KernelPluginDefinition, DbAdapter } from "../src/contracts/index.js";
import { InMemoryPluginRuntime } from "../src/runtime/index.js";
import type { PluginOperationsProvider } from "../src/plugin-api/index.js";
import { assertOperationContext } from "../src/runtime/operations/operation-context.js";
import { pluginOperationsProvider } from "../src/runtime/index.js";
import { CORE_TOKENS } from "../src/tokens/index.js";

async function fixture(t: test.TestContext) {
  const app = new TrinacriaApp();
  const calls: unknown[] = [];
  let received: unknown;
  const repo = { async findOne() { return null; }, async findMany(query: unknown) { calls.push(query); return []; },
    async insertOne(value: unknown) { return value; }, async updateOne() { return null; }, async deleteOne() { return false; } };
  const adapter: DbAdapter = { repository(entity, namespace) { calls.push({ entity, namespace }); return repo as any; },
    async beginTransaction() { throw new Error("not used"); }, async healthCheck() { return { ok: true }; },
    async withTransaction(namespace, work) { calls.push(namespace); return work(this); } };
  app.registerGlobalProvider(valueProvider(CORE_TOKENS.DB_ADAPTER, adapter));
  app.registerGlobalProvider(valueProvider(CORE_TOKENS.PLUGIN_SETTINGS_HOST, {
    async get(pluginId: string, key: string) { calls.push({ pluginId, key }); return "value"; },
    async set(pluginId: string, key: string, value: any) { calls.push({ pluginId, key }); received = value; }
  }));
  app.registerGlobalProvider(valueProvider(CORE_TOKENS.LOGGER, { info(message: string, metadata: unknown) { calls.push({ message, metadata }); }, warn() {}, error() {} }));
  await app.start(); t.after(() => app.shutdown());
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });
  let services!: PluginHostServices;
  const definition: KernelPluginDefinition = { manifest: { id: "catalog", version: "1.0.0", requiresCore: "^0.1.0",
    entities: [{ name: "items", schemaVersion: 1 }], settings: [{ key: "catalog:site:title", category: "site", visibility: "admin" }] },
    onLoad(context) { assert.equal("app" in context, false); assert.equal("events" in context, false); services = context.services; } };
  await runtime.register(definition); await runtime.load("catalog");
  return { app, runtime, services, definition, calls, received: () => received };
}

test("plugin services fix owner, restrict entities/settings, and bound pagination", async (t) => {
  const { services, calls } = await fixture(t);
  assert.ok(Object.isFrozen(services)); assert.ok(Object.isFrozen(services.storage));
  await services.storage.repository("items").findMany({});
  assert.deepEqual(calls.slice(0, 2), [{ entity: "items", namespace: { pluginId: "catalog" } }, { limit: 100 }]);
  assert.throws(() => services.storage.repository("foreign"), /not declared/);
  await assert.rejects(services.storage.repository("items").findMany({ limit: 101 }), /1–100/);
  await assert.rejects(services.storage.repository("items").findMany({ metadata: { owner: "foreign" } }), /host-only/);
  await assert.rejects(services.settings.get("other:site:title"), /not owned/);
  await assert.rejects(services.settings.get("catalog:site:missing"), /not owned/);
  assert.equal(await services.settings.get("catalog:site:title"), "value");
  await services.storage.transaction(async (storage) => {
    await storage.repository("items").findMany({ limit: 10 });
    await assert.rejects(storage.transaction(async () => null), /Nested/);
  });
});

test("host services from an unloaded or previous generation cannot be reused", async (t) => {
  const { runtime, services } = await fixture(t);
  const repository = services.storage.repository("items");
  await runtime.unload("catalog");
  await assert.rejects(repository.findMany({}), /inactive/);
  await assert.rejects(services.settings.get("catalog:site:title"), /inactive/);
  await runtime.load("catalog");
  await assert.rejects(repository.findMany({}), /inactive/);
});

test("settings inputs are copied and logs cannot override owner or include payload metadata", async (t) => {
  const { services, received, calls } = await fixture(t);
  const value = { title: "one" };
  await services.settings.set("catalog:site:title", value); value.title = "two";
  assert.deepEqual(received(), { title: "one" });
  await services.logger.info("secret=abc", { pluginId: "foreign", payload: { token: "never-log" }, action: "save", token: "never-log" });
  const log = calls.at(-1) as { message: string; metadata: unknown };
  assert.equal(log.message, "[redacted]"); assert.deepEqual(log.metadata, { action: "save", pluginId: "catalog" });
});

test("operations validate input, enforce private ownership and require policy for cross-plugin calls", async (t) => {
  const { app, runtime, services } = await fixture(t);
  const operationToken = createToken<PluginOperationsProvider>("fixture_operations");
  const requests: string[] = [];
  await app.registerModule(defineModule({ name: "OperationsModule", exports: [operationToken], providers: [pluginOperationsProvider(operationToken, "target", () => [
    { name: "public", requiredPermission: "target:items:read", input: s.object({ id: s.string() }), invoke(input, context) { assertOperationContext(context.operationContext); assert.deepEqual(context.operationContext.actor, { kind: "plugin", pluginId: "catalog" }); assert.equal(context.operationContext.operation, "public"); requests.push(context.callerPluginId); return input; } },
    { name: "private", private: true, input: s.object({}), invoke() { throw new Error("must not run"); } }
  ])] }));
  await runtime.register({ id: "target", version: "1.0.0", requiresCore: "^0.1.0", security: { permissions: [{ key: "target:items:read", displayName: "Read items" }] } });
  await runtime.load("target");
  await assert.rejects(services.operations.call("target", "private", {}), /denied/);
  await assert.rejects(services.operations.call("target", "public", { id: "one" }), /policy is required/);
  let authorize: (request: any) => any = (request) => ({ allowed: request.callerPluginId === "catalog" && request.ownerPluginId === "target" });
  await app.registerModule(defineModule({ name: "PolicyModule", providers: [valueProvider(CORE_TOKENS.PLUGIN_OPERATION_AUTHORIZER, {
    canInvoke(request: any) { return authorize(request); }
  })], exports: [CORE_TOKENS.PLUGIN_OPERATION_AUTHORIZER] }));
  await assert.rejects(services.operations.call("target", "public", {}));
  assert.deepEqual(await services.operations.call("target", "public", { id: "one" }), { id: "one" });
  assert.deepEqual(requests, ["catalog"]);
  authorize = () => ({ allowed: "yes" });
  await assert.rejects(services.operations.call("target", "public", { id: "one" }), /denied/);
  authorize = () => { throw new Error("secret=must-not-leak"); };
  await assert.rejects(services.operations.call("target", "public", { id: "one" }), (error: any) => {
    assert.equal(error.message, "Plugin operation policy failed");
    assert.equal(JSON.stringify(error).includes("must-not-leak"), false);
    return true;
  });
  let release!: (decision: { allowed: boolean }) => void;
  let started!: () => void;
  const waiting = new Promise<void>((resolve) => { started = resolve; });
  authorize = () => { started(); return new Promise((resolve) => { release = resolve; }); };
  const pending = services.operations.call("target", "public", { id: "one" });
  await waiting;
  const reload = runtime.reload("target");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.activity.snapshot("target").blocked, true);
  release({ allowed: true });
  await assert.rejects(pending, /draining/);
  await reload;
  assert.deepEqual(requests, ["catalog"]);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(services.operations.call("target", "public", { id: "one" }, { signal: controller.signal }));
  await runtime.unload("target");
  await assert.rejects(services.operations.call("target", "public", { id: "one" }), /drain/);
});

test("runtime binds the vault client to the plugin and expires it on unload", async (t) => {
  const { randomBytes } = await import("node:crypto");
  const { vaultDb } = await import("./_shared/secure-payloads-fixture.js");
  const { SecureEventPayloadsService, SecureEventPayloadsRepository, SecureEventPayloadCrypto } = await import("../src/runtime/index.js");
  const f = await fixture(t);
  const host = new SecureEventPayloadsService(new SecureEventPayloadsRepository(vaultDb().db), new SecureEventPayloadCrypto({ activeKeyId: "v1", keys: { v1: randomBytes(32) } }), { canClaim: () => ({ allowed: true }) });
  await f.app.registerModule(defineModule({ name: "VaultModule", providers: [valueProvider(CORE_TOKENS.SECURE_EVENT_PAYLOAD_HOST, host)], exports: [CORE_TOKENS.SECURE_EVENT_PAYLOAD_HOST] }));
  const client = f.services.securePayloads;
  assert.equal("forPlugin" in client, false);
  const input = { eventName: "catalog:ready", payloadType: "catalog:message", schemaVersion: 1, requiredPermission: "catalog:payload:read", payload: { token: "private-value" }, authorizedConsumerPluginIds: ["catalog"] };
  await assert.rejects(client.create({ ...input, producerPluginId: "foreign" } as any));
  const record = await client.create(input);
  assert.equal(record.producerPluginId, "catalog"); assert.equal("encryptedPayload" in record, false);
  const claim = await client.claim({ payloadId: record.id, eventName: input.eventName, payloadType: input.payloadType, schemaVersion: 1, requiredPermission: input.requiredPermission });
  assert.equal(claim.record.lastClaimedByPluginId, "catalog");
  await f.runtime.unload("catalog");
  await assert.rejects(client.create(input), /inactive/);
});
