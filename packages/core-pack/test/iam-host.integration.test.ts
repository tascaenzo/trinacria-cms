import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import test from "node:test";
import mongoose from "mongoose";
import { CORE_TOKENS, valueProvider } from "@trinacria-cms/kernel";
import { createInMemoryPluginRuntimeStore, createMongoDbAdapter, EntityRegistry, startCmsApp } from "@trinacria-cms/kernel/runtime";
import { createCorePackPlugin } from "../src/plugin/core-pack.plugin.js";
import { LocalCredentialsRepository } from "../src/modules/installation/repositories/local-credentials.repository.js";
import { PasswordHashingService } from "../src/modules/installation/services/password-hashing.service.js";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { RoleGrantsRepository } from "../src/modules/roles/grants/role-grants.repository.js";
import { RolesRepository } from "../src/modules/roles/repositories/roles.repository.js";
import { PermissionsRepository } from "../src/modules/permissions/repositories/permissions.repository.js";

test("IAM HTTP host supports delegated operators, preserves grants, prevents concurrent lockout and recovers locally", {
  skip: process.env.TRINACRIA_RUN_MONGO_INTEGRATION !== "1"
}, async () => {
  process.env.CMS_JWT_SECRET = randomBytes(48).toString("hex");
  process.env.CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID = "iam-test";
  process.env.CMS_SECURE_PAYLOAD_KEYS_JSON = JSON.stringify({ "iam-test": randomBytes(32).toString("base64") });
  const connection = await mongoose.createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", {
    dbName: `trinacria_iam_${randomUUID().replaceAll("-", "")}`
  }).asPromise();
  const registry = new EntityRegistry();
  const db = createMongoDbAdapter({ connection, entityRegistry: registry });
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  let handle: Awaited<ReturnType<typeof startCmsApp>> | undefined;
  const password = "IAmTestPassword123!";
  async function request(method: string, path: string, token?: string, data?: unknown) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {})
    });
    return { status: response.status, body: await response.json() as any };
  }
  async function ok(method: string, path: string, token?: string, data?: unknown) {
    const result = await request(method, path, token, data);
    assert.equal(result.status, 200, `${method} ${path}: ${result.body.error?.code ?? "unexpected status"}`);
    return result.body.data;
  }
  async function login(email: string, secret = password) {
    return (await ok("POST", "/v1/auth/login", undefined, { email, password: secret })).accessToken as string;
  }
  try {
    handle = await startCmsApp({ coreVersion: "0.1.0", plugins: [createCorePackPlugin()],
      globalProviders: [valueProvider(CORE_TOKENS.DB_ADAPTER, db), valueProvider(CORE_TOKENS.ENTITY_REGISTRY, registry)],
      pluginRuntimeStore: createInMemoryPluginRuntimeStore(), http: { host: "127.0.0.1", port } });
    await ok("POST", "/v1/install/bootstrap", undefined, { email: "first@iam.test", firstName: "First", lastName: "Admin",
      password, confirmPassword: password, siteName: "IAM fixture", dataMode: "empty" });
    let firstToken = await login("first@iam.test");
    const first = await ok("GET", "/v1/auth/me", firstToken);
    const create = async (email: string, role?: string) => {
      const user = await ok("POST", "/v1/users", firstToken, { email, firstName: "Test", lastName: "Operator" });
      await new LocalCredentialsRepository(db).upsert({ userId: user.id, ...await new PasswordHashingService().hashPassword(password) });
      if (role) await ok("POST", `/v1/users/${user.id}/roles`, firstToken, { roleCode: role });
      return user;
    };
    const operator = await create("operator@iam.test", "editor");
    const operatorToken = await login(operator.email);
    await ok("GET", "/v1/admin/extensions", operatorToken);
    await ok("GET", `/v1/users/${operator.id}/roles`, operatorToken);
    const allowed = await ok("GET", `/v1/users/${operator.id}/permissions`, operatorToken);
    assert.ok(allowed.includes("core-pack:backoffice:access"));
    assert.equal((await request("PATCH", `/v1/users/${first.id}/status`, operatorToken, { status: "suspended" })).status, 403);
    const publicUser = await create("public@iam.test");
    const publicToken = await login(publicUser.email);
    assert.deepEqual(await ok("GET", `/v1/users/${publicUser.id}/roles`, publicToken), []);
    assert.equal((await request("GET", `/v1/users/${first.id}/roles`, publicToken)).status, 403);
    assert.equal((await request("GET", "/v1/admin/extensions", publicToken)).status, 403);

    const lastAdmin = await request("PATCH", `/v1/users/${first.id}`, firstToken, { firstName: "First", lastName: "Admin", status: "suspended" });
    assert.equal(lastAdmin.status, 409);
    assert.equal(lastAdmin.body.error.code, "iam_last_admin");
    await ok("GET", "/v1/users", firstToken); // rollback retained the active account
    const denyLast = await request("POST", "/v1/roles/admin/policy-rules", firstToken, { effect: "deny", permissionPattern: "core-pack:roles:write", conditions: [] });
    assert.equal(denyLast.status, 409);
    assert.equal(denyLast.body.error.code, "iam_last_admin");
    assert.deepEqual(await ok("GET", "/v1/roles/admin/policy-rules", firstToken), []);


    const second = await create("second@iam.test", "admin");
    const secondToken = await login(second.email);
    await ok("GET", "/v1/users", secondToken);
    await ok("PATCH", `/v1/users/${first.id}/status`, secondToken, { status: "suspended" });
    assert.equal((await request("GET", "/v1/auth/me", firstToken)).status, 401);
    await ok("PATCH", `/v1/users/${first.id}/status`, secondToken, { status: "active" });
    assert.equal((await request("GET", "/v1/auth/me", firstToken)).status, 401, "reactivation must not revive prior sessions");
    firstToken = await login(first.email);

    const roles = new RolesRepository(db);
    const role = await roles.findByCode("editor");
    assert.ok(role);
    await new PermissionsRepository(db).upsertOwnedPermission({ key: "fixture:records:read", displayName: "Read fixture", sourcePluginId: "fixture" });
    await new RoleGrantsRepository(db).upsert({ roleCode: "editor", permissionKey: "fixture:records:read", sourcePluginId: "fixture" });
    const editable = await ok("GET", `/v1/roles/${role.id}`, firstToken);
    const desired = editable.permissions.filter((key: string) => key !== "fixture:records:read");
    const saved = await ok("PATCH", `/v1/roles/${role.id}`, firstToken, { name: editable.name, permissions: desired, expectedUpdatedAt: editable.updatedAt });
    assert.ok(!saved.permissions.includes("fixture:records:read"));
    assert.ok((await new RoleGrantsRepository(db).listBySourcePlugin("fixture")).some((grant) => grant.permissionKey === "fixture:records:read"));
    assert.ok(!(await ok("GET", `/v1/users/${operator.id}/permissions`, operatorToken)).includes("fixture:records:read"));
    assert.equal((await request("PATCH", `/v1/roles/${role.id}`, firstToken, { name: "Stale", expectedUpdatedAt: editable.updatedAt })).status, 409);

    const concurrentEdits = await Promise.all([
      request("PATCH", `/v1/roles/${role.id}`, firstToken, { name: "Editor A", expectedUpdatedAt: saved.updatedAt }),
      request("PATCH", `/v1/roles/${role.id}`, firstToken, { name: "Editor B", expectedUpdatedAt: saved.updatedAt })
    ]);
    assert.deepEqual(concurrentEdits.map(result => result.status).sort(), [200, 409]);
    await new RoleGrantsRepository(db).deleteBySourcePlugin("fixture");
    assert.ok((await new RoleGrantsRepository(db).listByRoleCode("editor")).every((grant) => grant.sourcePluginId !== "fixture"));

    const race = await Promise.all([
      request("DELETE", `/v1/users/${first.id}/roles/admin`, firstToken),
      request("DELETE", `/v1/users/${second.id}/roles/admin`, secondToken)
    ]);
    assert.deepEqual(race.map((result) => result.status).sort(), [200, 409]);
    const recovery = spawn(process.execPath, [fileURLToPath(new URL("../scripts/recover-admin.mjs", import.meta.url)), "--database", connection.name, "--email", first.email, "--reset-mfa"], { env: { ...process.env, MONGO_URI: "mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin" }, stdio: ["pipe", "pipe", "pipe"] });
    let recoveryOutput = "", recoveryError = "";
    recovery.stdout.on("data", chunk => { recoveryOutput += chunk; });
    recovery.stderr.on("data", chunk => { recoveryError += chunk; });
    const recoveryExit = new Promise<number | null>((resolve, reject) => { recovery.on("error", reject); recovery.on("close", resolve); });
    recovery.stdin.end("RecoveredPassword123!\n");
    assert.equal(await recoveryExit, 0, recoveryError);
    assert.equal(JSON.parse(recoveryOutput).recovered, first.id);
    assert.ok(!recoveryOutput.includes("RecoveredPassword123!"));
    assert.equal((await request("GET", "/v1/auth/me", firstToken)).status, 401);
    const recoveredToken = await login(first.email, "RecoveredPassword123!");
    await ok("GET", "/v1/users", recoveredToken);
    const adminRole = await roles.findByCode("admin");
    assert.ok(adminRole);
    assert.equal((await request("PATCH", `/v1/roles/${adminRole.id}/status`, recoveredToken, { status: "disabled", expectedUpdatedAt: adminRole.updatedAt })).status, 409);
    const audit = await ok("GET", "/v1/security/audit", recoveredToken);
    assert.ok(audit.some((entry: any) => entry.reason === "iam-mutation-completed"));
    assert.ok(audit.some((entry: any) => entry.reason === "iam-mutation-failed"));
  } finally {
    await handle?.shutdown();
    await connection.dropDatabase();
    await connection.close();
  }
});
