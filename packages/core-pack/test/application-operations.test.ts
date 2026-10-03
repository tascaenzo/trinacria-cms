import assert from "node:assert/strict";
import test from "node:test";
import { createDelegatedPluginOperationContext, createPluginOperationContext, createSystemOperationContext, createUserOperationContext } from "@trinacria-cms/kernel/runtime";
import { CoreOperationAuthorizer } from "../src/operations/core-operation-authorizer.js";
import { createSettingsOperations } from "../src/operations/settings-operations.js";
import { createPermissionsOperations, createRolesOperations, createUserAccessOperations, createUsersOperations } from "../src/operations/access-operations.js";
import { ExternalPluginHttpAccessPolicyService } from "../src/modules/settings/plugin-access/external-plugin-http-access-policy.service.js";
import { CORE_PACK_MANIFEST } from "../src/plugin/core-pack.manifest.js";

const user = createUserOperationContext("actual-user");
const target = { ownerPluginId: "editorial-pack", resource: "entries", action: "publish" };
function policy() {
  const state = { user: false, plugin: false, error: false };
  const requests: unknown[] = [];
  const authorizer = new CoreOperationAuthorizer({ can: async (request: unknown) => { requests.push(request); if (state.error) throw new Error("password=never-return"); return { allowed: state.user }; } } as never, { canOperate: async () => ({ allowed: state.plugin }) });
  return { state, requests, authorizer };
}
const denied = (error: unknown) => (error as { code?: string }).code === "operation_forbidden";

test("contexts cannot be forged or copied, and delegation needs an authenticated user", async () => {
  const { authorizer, state } = policy(); state.user = true;
  await assert.rejects(authorizer.assert(JSON.parse(JSON.stringify(user)), target), denied);
  await assert.rejects(authorizer.assert({ ...user }, target), denied);
  assert.throws(() => createDelegatedPluginOperationContext("caller", { ...user }), denied);
  assert.throws(() => createDelegatedPluginOperationContext("caller", createPluginOperationContext("other")), denied);
  await authorizer.assert(user, target);
  assert.equal(Object.isFrozen(user), true);
});

test("delegation requires installed integration contract AND user permission", async () => {
  const { authorizer, state, requests } = policy();
  const context = createDelegatedPluginOperationContext("caller", user);
  state.user = true; await assert.rejects(authorizer.assert(context, target), denied);
  state.plugin = true; state.user = false; await assert.rejects(authorizer.assert(context, target), denied);
  state.user = true; await authorizer.assert(context, target);
  assert.equal((requests.at(-1) as { subjectId: string }).subjectId, "actual-user");
  state.plugin = false; await assert.rejects(authorizer.assert(context, target), denied);
});

test("system context has only its exact allowlist, with no admin wildcard", async () => {
  const { authorizer } = policy();
  const context = createSystemOperationContext("migration", [{ ...target, resourceId: "one" }]);
  await authorizer.assert(context, { ...target, resourceId: "one" });
  await assert.rejects(authorizer.assert(context, { ...target, resourceId: "two" }), denied);
  await assert.rejects(authorizer.assert(context, { ...target, action: "delete", resourceId: "one" }), denied);
  await assert.rejects(authorizer.assert(context, { ...target, ownerPluginId: "other", resourceId: "one" }), denied);
  await assert.rejects(authorizer.assert(createSystemOperationContext("migration", [{ ...target, action: "*" }]), { ...target, action: "*" }), denied);
});

test("policy failures deny with a fixed, redacted application error", async () => {
  const { authorizer, state } = policy(); state.error = true;
  await assert.rejects(authorizer.assert(user, target), (error: unknown) => denied(error) && !String(error).includes("never-return"));
  await assert.rejects(new CoreOperationAuthorizer({} as never).assert(createPluginOperationContext("caller"), target), denied);
});

test("external HTTP grants are exact, revocable and optionally operation-bound", async () => {
  let grants: unknown[] = [{ id: "api", accessType: "api", producerPluginId: "editorial-pack", consumerPluginId: "caller", resource: "entries", action: "publish", operation: "entries.transition", requiredPermission: "editorial-pack:entries:publish", status: "approved", requestedAt: new Date().toISOString() }];
  const service = new ExternalPluginHttpAccessPolicyService({ find: async (input: Record<string, unknown>) => grants.find((g: any) => g.accessType === input.accessType && g.producerPluginId === input.producerPluginId && g.consumerPluginId === input.consumerPluginId && g.resource === input.resource && g.action === input.action && (g.operation ?? "") === (input.operation ?? "") && g.requiredPermission === input.requiredPermission) ?? null, request: async () => ({}) } as never);
  const context = createPluginOperationContext("caller", "http", undefined, "entries.transition");
  assert.equal((await service.canOperate(context, target)).allowed, true);
  assert.equal((await service.canOperate(createPluginOperationContext("caller", "http"), target)).allowed, false);
  assert.equal((await service.canOperate(createPluginOperationContext("foreign", "http", undefined, "entries.transition"), target)).allowed, false);
  for (const status of ["pending", "denied", "revoked"]) { (grants[0] as Record<string, unknown>).status = status; assert.equal((await service.canOperate(context, target)).allowed, false); }
  assert.equal((await service.canOperate(createPluginOperationContext("caller", "plugin", undefined, "entries.transition"), target)).allowed, false);
});

test("internal access mutations cannot bypass user, role or permission checks", async () => {
  const { authorizer, state } = policy(); let writes = 0;
  const raw = new Proxy({}, { get: () => async () => { writes++; return {}; } }) as never;
  for (const [operations, method] of [[createUsersOperations(raw, authorizer), "suspendUser"], [createRolesOperations(raw, authorizer), "disableRole"], [createPermissionsOperations(raw, authorizer), "disablePermission"]] as const) {
    await assert.rejects((operations as unknown as Record<string, (context: typeof user, id: string) => Promise<unknown>>)[method](user, "victim"), denied);
  }
  const access = createUserAccessOperations(raw, new CoreOperationAuthorizer({ can: async (request: { resource: string }) => ({ allowed: request.resource === "users" }) } as never));
  await assert.rejects(access.assignRoleToUser(user, "victim", "admin"), denied);
  assert.equal(writes, 0);
  state.user = true;
  await createUsersOperations(raw, authorizer).suspendUser(user, "victim"); assert.equal(writes, 1);
});

test("settings writes derive the principal from context", async () => {
  const { authorizer, state } = policy(); state.user = true;
  let written: Record<string, unknown> | undefined;
  const operations = createSettingsOperations({ upsertValue: async (input: Record<string, unknown>) => { written = input; return input; } } as never, authorizer);
  await operations.upsertValue(user, { requesterPluginId: "spoof", key: "core-pack:site:name", value: "Site", updatedBy: "spoof" });
  assert.equal(written?.updatedBy, "actual-user"); assert.equal(written?.requesterPluginId, "core-pack");
});

test("settings read does not imply secrets read and plugin identity cannot be substituted", async () => {
  let writes = 0;
  const { authorizer, state } = policy(); state.plugin = true;
  const ops = createSettingsOperations({ upsertValue: async (input: { requesterPluginId: string }) => { assert.equal(input.requesterPluginId, "caller"); writes++; }, revealSecret: async () => { throw new Error("must not reach secret"); } } as never, authorizer);
  await ops.upsertValue(createPluginOperationContext("caller"), { requesterPluginId: "other", key: "caller:domain:key", value: 1 }); assert.equal(writes, 1);
  await assert.rejects(ops.revealSecret(user, "core-pack", "core-pack:auth:secret"), denied);
});

test("new operational permissions are provisioned only to the Core admin role", () => {
  const keys = ["core-pack:plugins:manage", "core-pack:plugin-grants:read", "core-pack:plugin-grants:manage", "core-pack:migrations:read", "core-pack:migrations:apply", "core-pack:deliveries:read", "core-pack:deliveries:manage", "core-pack:audit:read"];
  for (const key of keys) {
    assert.ok(CORE_PACK_MANIFEST.security?.permissions?.some((permission) => permission.key === key));
    assert.ok(CORE_PACK_MANIFEST.security?.grants?.find((grant) => grant.roleCode === "admin")?.permissionKeys.includes(key));
    for (const role of ["editor", "viewer"]) assert.equal(CORE_PACK_MANIFEST.security?.grants?.find((grant) => grant.roleCode === role)?.permissionKeys.includes(key), false);
  }
});
