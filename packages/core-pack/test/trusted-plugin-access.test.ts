import assert from "node:assert/strict";
import test from "node:test";
import { createApplicationOperations, createDelegatedPluginOperationContext, createPluginOperationContext, createUserOperationContext } from "@trinacria-cms/kernel/runtime";
import type { PluginRuntimeRecord, SecureEventPayloadRecord } from "@trinacria-cms/kernel/contracts";
import { CoreOperationAuthorizer } from "../src/operations/core-operation-authorizer.js";
import { TrustedPluginAccessPolicyService } from "../src/modules/settings/plugin-access/trusted-plugin-access-policy.service.js";

function fixture() {
  const records: PluginRuntimeRecord[] = [
    { manifest: { id: "owner", version: "0.1.0", requiresCore: "^0.1.0", security: { permissions: [{ key: "owner:items:read", displayName: "Read" }] }, events: { emits: [{ name: "changed", visibility: "protected", delivery: "sync", version: 1 }] } }, state: "loaded" },
    { manifest: { id: "consumer", version: "0.1.0", requiresCore: "^0.1.0", dependencies: [{ pluginId: "owner", versionRange: "^0.1.0" }], events: { subscribes: [{ eventName: "owner:changed", handler: "observe", requiredPermission: "owner:items:read" }] } }, state: "loaded" }
  ];
  let externalChecks = 0;
  const policy = new TrustedPluginAccessPolicyService({ list: () => records }, { canOperate: async () => { externalChecks++; return { allowed: false }; } });
  return { records, policy, externalChecks: () => externalChecks };
}
const target = { ownerPluginId: "owner", resource: "items", action: "read" };

test("installed declared integrations work without persisted grants; HTTP identities remain distinct", async () => {
  const { policy, externalChecks } = fixture();
  assert.equal((await policy.canInvoke({ callerPluginId: "consumer", ownerPluginId: "owner", operation: "items.get", requiredPermission: "owner:items:read" })).allowed, true);
  assert.equal((await policy.canOperate(createPluginOperationContext("consumer"), target)).allowed, true);
  assert.equal((await policy.canSubscribe({ subscriberPluginId: "consumer", eventOwnerPluginId: "owner", eventName: "owner:changed", eventVisibility: "protected", requiredPermission: "owner:items:read" })).allowed, true);
  assert.equal(externalChecks(), 0);
  assert.equal((await policy.canOperate(createPluginOperationContext("consumer", "http"), target)).allowed, false);
  assert.equal(externalChecks(), 1);
});

test("undeclared dependencies, permissions and inactive plugins are rejected", async () => {
  const { records, policy } = fixture();
  records[1].manifest.dependencies = [];
  assert.equal((await policy.canOperate(createPluginOperationContext("consumer"), target)).allowed, false);
  records[1].manifest.dependencies = [{ pluginId: "owner", versionRange: "^0.1.0" }];
  assert.equal((await policy.canOperate(createPluginOperationContext("consumer"), { ...target, action: "delete" })).allowed, false);
  records[1].state = "disabled";
  assert.equal((await policy.canOperate(createPluginOperationContext("consumer"), target)).allowed, false);
});

test("accepted trusted operations check each target once; user delegation still restricts access", async () => {
  const { policy, externalChecks } = fixture();
  let checks = 0, writes = 0, allowed = false;
  const authorizer = new CoreOperationAuthorizer({ can: async () => { checks++; return { allowed }; } } as never, policy);
  const operations = createApplicationOperations({ get: async () => { writes++; return "record"; } }, authorizer, { get: { target } });
  const delegated = createDelegatedPluginOperationContext("consumer", createUserOperationContext("viewer"));
  await assert.rejects(operations.get(delegated), { code: "operation_forbidden" });
  assert.equal(writes, 0);
  allowed = true; checks = 0;
  assert.equal(await operations.get(delegated), "record");
  assert.equal(checks, 1);
  assert.equal(externalChecks(), 0);
  await assert.rejects(operations.get({ ...delegated }), { code: "operation_forbidden" });
});

test("an accepted operation may finish after a configuration change; the next operation is denied", async () => {
  const { policy, records } = fixture();
  let entered!: () => void, release!: () => void;
  const ready = new Promise<void>(resolve => { entered = resolve; });
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const authorizer = new CoreOperationAuthorizer({} as never, policy);
  const operations = createApplicationOperations({ get: async () => { entered(); await barrier; return "record"; } }, authorizer, { get: { target } });
  const context = createPluginOperationContext("consumer");
  const pending = operations.get(context);
  await ready; records[1].manifest.dependencies = []; release();
  assert.equal(await pending, "record");
  await assert.rejects(operations.get(context), { code: "operation_forbidden" });
});

test("vault permission may belong to its consumer, without expanding producer-authorized recipients", async () => {
  const { policy, records, externalChecks } = fixture();
  records[1].manifest.security = { permissions: [{ key: "consumer:email:send", displayName: "Send email" }] };
  records[1].manifest.events = { subscribes: [{ eventName: "*:changed", handler: "send" }] };
  const payload: SecureEventPayloadRecord = { id: "payload", producerPluginId: "owner", eventName: "owner:changed", payloadType: "consumer:message", schemaVersion: 1, requiredPermission: "consumer:email:send", status: "available", maxClaims: 1, claimCount: 0, authorizedConsumerPluginIds: ["consumer"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const request = { payload, consumerPluginId: "consumer", eventName: payload.eventName, requiredPermission: payload.requiredPermission };
  assert.equal((await policy.canClaim(request)).allowed, true);
  assert.equal(externalChecks(), 0);
  assert.equal((await policy.canClaim({ ...request, requiredPermission: "owner:items:read" })).allowed, false);
  payload.authorizedConsumerPluginIds = ["another"];
  assert.equal((await policy.canClaim(request)).allowed, false);
  payload.authorizedConsumerPluginIds = ["consumer"]; records[1].state = "disabled";
  assert.equal((await policy.canClaim(request)).allowed, false);
});
