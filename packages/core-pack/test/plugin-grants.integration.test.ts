import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { EntityRegistry, createMongoDbAdapter, createPluginOperationContext, createUserOperationContext, registerPlatformEntities } from "@trinacria-cms/kernel/runtime";
import { PluginGrantsRepository, PLUGIN_GRANTS_ENTITY, normalizeGrant } from "../src/modules/settings/plugin-access/plugin-grants.repository.js";
import { SecurityAuditStore, SECURITY_AUDIT_ENTITY } from "../src/modules/security/audit/security-audit.js";
import { ExternalPluginHttpAccessPolicyService } from "../src/modules/settings/plugin-access/external-plugin-http-access-policy.service.js";
import { createPluginGrantOperations } from "../src/operations/plugin-grant-operations.js";
const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
test("grant requests are unique across hosts, CAS decisions and audit atomic; revocation reads primary", { skip: !enabled }, async () => {
  const uri = process.env.TRINACRIA_MONGO_URI ?? "mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin"; const dbName = `trinacria_grants_test_${Date.now()}`;
  const connections = await Promise.all([mongoose.createConnection(uri, { dbName }).asPromise(), mongoose.createConnection(uri, { dbName }).asPromise()]);
  const make = (connection: mongoose.Connection) => { const registry = new EntityRegistry(); registerPlatformEntities(registry); registry.register(PLUGIN_GRANTS_ENTITY); registry.register(SECURITY_AUDIT_ENTITY); return createMongoDbAdapter({ connection, entityRegistry: registry }); };
  try {
    const db = make(connections[0]), db2 = make(connections[1]); const first = new PluginGrantsRepository(db), second = new PluginGrantsRepository(db2);
    const identity = { producerPluginId: "source", consumerPluginId: "receiver", accessType: "api" as const, resource: "settings", action: "read", requiredPermission: "source:settings:read" };
    const requests = await Promise.all([first.request(identity), second.request(identity)]); assert.equal(requests[0].id, requests[1].id); assert.equal((await first.list()).length, 1);
    await db.repository("platform_audit", { pluginId: "kernel" }).insertOne({ id: "platform-proof", at: new Date(), owner: "source", actorId: "deploy-operator", actorKind: "user", instanceId: "host", action: "migration.applied", outcome: "allowed", resourceId: "schema-v2", reason: "migration-applied", backupReference: "must-not-be-returned", encryptedPayload: "must-not-be-returned", purgeAt: new Date(Date.now() + 90000) });
    const merged = new SecurityAuditStore(db, 90, true);
    const platform = await merged.list({ actorId: "deploy-operator" }); assert.equal(platform.length, 1); assert.equal(platform[0].ownerPluginId, "source"); assert.doesNotMatch(JSON.stringify(platform), /must-not-be-returned|purgeAt|backupReference|encryptedPayload/);
    const audit = new SecurityAuditStore(db); assert.equal((await audit.list()).length, 1);
    const decisions = await Promise.allSettled([first.decide(requests[0].id, "approved", 1, "admin-one", "reviewed"), second.decide(requests[0].id, "revoked", 1, "admin-two", "deny")]);
    assert.equal(decisions.filter(d => d.status === "fulfilled").length, 1); assert.equal((decisions.find(d => d.status === "rejected") as PromiseRejectedResult).reason.code, "plugin_grant_conflict"); assert.equal((await audit.list()).length, 2);
    const current = (await first.get(requests[0].id))!;
    const approved = await first.decide(current.id, "approved", current.revision, "real-admin", "approved");
    const policy = new ExternalPluginHttpAccessPolicyService(second);
    const context = createPluginOperationContext("receiver", "http");
    const target = { ownerPluginId: "source", resource: "settings", action: "read" };
    assert.equal((await policy.canOperate(context, target)).allowed, true);
    await first.decide(approved.id, "revoked", approved.revision, "real-admin", "revoked");
    assert.equal((await policy.canOperate(context, target)).allowed, false);
    assert.equal((await policy.canOperate(createPluginOperationContext("foreign", "http"), target)).allowed, false);
    assert.equal((await policy.canOperate(context, { ...target, action: "write" })).allowed, false);
    const api = { producerPluginId: "source", consumerPluginId: "receiver", accessType: "api" as const, resource: "entries", action: "publish", requiredPermission: "source:entries:publish", operation: "entries.transition" };
    const pending = await first.request(api);
    const deniedOps = createPluginGrantOperations(first, { async assert() { throw new Error("denied"); } }); await assert.rejects(deniedOps.decide(createUserOperationContext("real-user"), pending.id, "approved", 1, "spoof", "reviewed"), /denied/);
    const ops = createPluginGrantOperations(first, { async assert() {} }); const result = await ops.decide(createUserOperationContext("real-user"), pending.id, "approved", 1, "spoof", "reviewed"); assert.equal(result.approvedBy, "real-user");
    await assert.rejects(ops.decide(createPluginOperationContext("receiver"), pending.id, "approved", 2, "spoof", "reviewed"), { code: "operation_forbidden" });
    assert.equal((await policy.canOperate(createPluginOperationContext("receiver", "http", undefined, "entries.transition"), { ownerPluginId: "source", resource: "entries", action: "publish" })).allowed, true);
    assert.equal((await policy.canOperate(createPluginOperationContext("receiver", "http", undefined, "entries.delete"), { ownerPluginId: "source", resource: "entries", action: "publish" })).allowed, false);
    // Audit failure must roll back the decision, including its revision.
    const failing = new PluginGrantsRepository(db, { async appendIn() { throw new Error("audit-down"); } } as never);
    await assert.rejects(failing.decide(result.id, "revoked", result.revision, "operator", "reviewed"), /audit-down/); assert.equal((await first.get(result.id))!.revision, result.revision);
    assert.throws(() => normalizeGrant({ ...identity, accessType: undefined } as never)); assert.throws(() => normalizeGrant({ ...api, requiredPermission: "foreign:entries:publish" }));
    const rows = await audit.list(); assert.ok(rows.every(row => !JSON.stringify(row).includes("secret=")));

  } finally { await connections[0].dropDatabase(); await Promise.all(connections.map(c => c.close())); }
});
