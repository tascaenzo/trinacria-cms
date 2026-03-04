import assert from "node:assert/strict";
import test from "node:test";
import type {
  AuthorizationRequest,
  DbAdapter,
  DbQuery,
  DbRepository,
} from "@trinacria-cms/kernel";
import { PermissionsRepository } from "../src/modules/permissions/permissions.repository.js";
import { RoleGrantsRepository } from "../src/modules/roles/role-grants.repository.js";
import { RolesRepository } from "../src/modules/roles/roles.repository.js";
import { CorePackAuthzService } from "../src/modules/security/core-pack-authz.service.js";
import { RolePolicyRulesRepository } from "../src/modules/security/role-policy-rules.repository.js";
import { UserAccessService } from "../src/modules/security/user-access.service.js";
import { UserRolesRepository } from "../src/modules/security/user-roles.repository.js";
import { UsersRepository } from "../src/modules/users/users.repository.js";
import { UsersService } from "../src/modules/users/users.service.js";

test("UserAccessService resolves effective permissions from user role assignments", async () => {
  const db = createFakeDbAdapter();
  const users = new UsersRepository(db);
  const roles = new RolesRepository(db);
  const grants = new RoleGrantsRepository(db);
  const permissions = new PermissionsRepository(db);
  const userRoles = new UserRolesRepository(db);
  const rolePolicyRules = new RolePolicyRulesRepository(db);
  const usersService = new UsersService(users);
  const access = new UserAccessService(
    users,
    roles,
    grants,
    rolePolicyRules,
    permissions,
    userRoles,
  );

  const user = await usersService.createUser({
    email: "access@example.com",
    displayName: "Access User",
  });

  await permissions.upsertOwnedPermission({
    key: "core-pack:users:read",
    displayName: "Read users",
    sourcePluginId: "core-pack",
  });
  await roles.upsertOwnedRole({
    code: "editor",
    name: "Editor",
    ownerPluginId: "core-pack",
  });
  await grants.upsert({
    roleCode: "editor",
    permissionKey: "core-pack:users:read",
    sourcePluginId: "core-pack",
  });

  const assignment = await access.assignRoleToUser(user.id, "editor");
  assert.equal(assignment.userId, user.id);
  assert.equal(assignment.roleCode, "editor");

  const effective = await access.resolveUserPermissions(user.id);
  assert.deepEqual(effective, ["core-pack:users:read"]);
});

test("CorePackAuthzService evaluates and asserts permissions", async () => {
  const db = createFakeDbAdapter();
  const users = new UsersRepository(db);
  const roles = new RolesRepository(db);
  const grants = new RoleGrantsRepository(db);
  const permissions = new PermissionsRepository(db);
  const userRoles = new UserRolesRepository(db);
  const rolePolicyRules = new RolePolicyRulesRepository(db);
  const usersService = new UsersService(users);
  const access = new UserAccessService(
    users,
    roles,
    grants,
    rolePolicyRules,
    permissions,
    userRoles,
  );
  const authz = new CorePackAuthzService(access);

  const user = await usersService.createUser({
    email: "authz@example.com",
    displayName: "Authz User",
  });

  await permissions.upsertOwnedPermission({
    key: "core-pack:users:write",
    displayName: "Write users",
    sourcePluginId: "core-pack",
  });
  await roles.upsertOwnedRole({
    code: "admin",
    name: "Admin",
    ownerPluginId: "core-pack",
  });
  await grants.upsert({
    roleCode: "admin",
    permissionKey: "core-pack:users:write",
    sourcePluginId: "core-pack",
  });
  await access.assignRoleToUser(user.id, "admin");

  const allowedRequest: AuthorizationRequest = {
    subjectId: user.id,
    action: "write",
    resource: "users",
    context: { pluginId: "core-pack" },
  };
  const deniedRequest: AuthorizationRequest = {
    subjectId: user.id,
    action: "delete",
    resource: "users",
    context: { pluginId: "core-pack" },
  };

  const allowed = await authz.can(allowedRequest);
  assert.equal(allowed.allowed, true);

  const denied = await authz.can(deniedRequest);
  assert.equal(denied.allowed, false);
  await assert.rejects(async () => authz.assert(deniedRequest));
});

test("CorePackAuthzService supports wildcard allow and deny precedence", async () => {
  const db = createFakeDbAdapter();
  const users = new UsersRepository(db);
  const roles = new RolesRepository(db);
  const grants = new RoleGrantsRepository(db);
  const permissions = new PermissionsRepository(db);
  const userRoles = new UserRolesRepository(db);
  const rolePolicyRules = new RolePolicyRulesRepository(db);
  const usersService = new UsersService(users);
  const access = new UserAccessService(
    users,
    roles,
    grants,
    rolePolicyRules,
    permissions,
    userRoles,
  );
  const authz = new CorePackAuthzService(access);

  const user = await usersService.createUser({
    email: "wildcard@example.com",
    displayName: "Wildcard User",
  });

  await roles.upsertOwnedRole({
    code: "auditor",
    name: "Auditor",
    ownerPluginId: "core-pack",
  });
  await rolePolicyRules.upsert({
    roleCode: "auditor",
    effect: "allow",
    permissionPattern: "core-pack:users:*",
    sourcePluginId: "core-pack",
  });
  await rolePolicyRules.upsert({
    roleCode: "auditor",
    effect: "deny",
    permissionPattern: "core-pack:users:delete",
    sourcePluginId: "core-pack",
  });
  await access.assignRoleToUser(user.id, "auditor");

  const allowRead = await authz.can({
    subjectId: user.id,
    action: "read",
    resource: "users",
    context: { pluginId: "core-pack" },
  });
  assert.equal(allowRead.allowed, true);

  const denyDelete = await authz.can({
    subjectId: user.id,
    action: "delete",
    resource: "users",
    context: { pluginId: "core-pack" },
  });
  assert.equal(denyDelete.allowed, false);
});

test("CorePackAuthzService evaluates conditional policy rules", async () => {
  const db = createFakeDbAdapter();
  const users = new UsersRepository(db);
  const roles = new RolesRepository(db);
  const grants = new RoleGrantsRepository(db);
  const permissions = new PermissionsRepository(db);
  const userRoles = new UserRolesRepository(db);
  const rolePolicyRules = new RolePolicyRulesRepository(db);
  const usersService = new UsersService(users);
  const access = new UserAccessService(
    users,
    roles,
    grants,
    rolePolicyRules,
    permissions,
    userRoles,
  );
  const authz = new CorePackAuthzService(access);

  const user = await usersService.createUser({
    email: "conditions@example.com",
    displayName: "Condition User",
  });

  await roles.upsertOwnedRole({
    code: "self-reader",
    name: "Self Reader",
    ownerPluginId: "core-pack",
  });
  await rolePolicyRules.upsert({
    roleCode: "self-reader",
    effect: "allow",
    permissionPattern: "core-pack:profiles:read",
    conditions: ["resource_id_equals_subject"],
    sourcePluginId: "core-pack",
  });
  await access.assignRoleToUser(user.id, "self-reader");

  const allowSelf = await authz.can({
    subjectId: user.id,
    action: "read",
    resource: "profiles",
    resourceId: user.id,
    context: { pluginId: "core-pack" },
  });
  assert.equal(allowSelf.allowed, true);

  const denyOther = await authz.can({
    subjectId: user.id,
    action: "read",
    resource: "profiles",
    resourceId: "other-subject",
    context: { pluginId: "core-pack" },
  });
  assert.equal(denyOther.allowed, false);
});

function createFakeDbAdapter(): DbAdapter {
  const buckets = new Map<string, Array<Record<string, unknown>>>();
  let sequence = 0;

  const getBucket = (key: string) => {
    const existing = buckets.get(key);
    if (existing) return existing;
    const created: Array<Record<string, unknown>> = [];
    buckets.set(key, created);
    return created;
  };

  const repository = <TData extends Record<string, unknown>>(
    key: string,
  ): DbRepository<TData> => ({
    async findOne(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const found =
        bucket.find((item) => matchesFilter(item, query.filter)) ?? null;
      if (!found) return null;
      return query.parse ? query.parse(found) : found;
    },
    async findMany(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const filtered = bucket.filter((item) => matchesFilter(item, query.filter));
      const sorted = applySort(filtered, query.sort);
      const offset = query.offset ?? 0;
      const limit = query.limit ?? sorted.length;
      const sliced = sorted.slice(offset, offset + limit);
      return sliced.map((item) => (query.parse ? query.parse(item) : item));
    },
    async insertOne(data: Partial<TData>) {
      const bucket = getBucket(key) as TData[];
      const record = { ...data } as TData & { id?: string };
      if (!record.id) {
        sequence += 1;
        record.id = `${key}:${sequence}`;
      }
      bucket.push(record);
      return record;
    },
    async updateOne(query: DbQuery<TData>, patch: Partial<TData>) {
      const bucket = getBucket(key) as TData[];
      const index = bucket.findIndex((item) => matchesFilter(item, query.filter));
      if (index < 0) return null;
      const updated = {
        ...bucket[index],
        ...patch,
      } as TData;
      bucket[index] = updated;
      return updated;
    },
    async deleteOne(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const index = bucket.findIndex((item) => matchesFilter(item, query.filter));
      if (index < 0) return false;
      bucket.splice(index, 1);
      return true;
    },
  });

  return {
    repository(entityName, context) {
      return repository(`${context.pluginId}:${entityName}`);
    },
    async beginTransaction() {
      return {
        async commit() {},
        async rollback() {},
      };
    },
    async healthCheck() {
      return { ok: true };
    },
  };
}

function matchesFilter(
  item: Record<string, unknown>,
  filter: Record<string, unknown> | undefined,
): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([key, value]) => item[key] === value);
}

function applySort<TData extends Record<string, unknown>>(
  values: readonly TData[],
  sort: Record<string, "asc" | "desc"> | undefined,
): TData[] {
  if (!sort || Object.keys(sort).length === 0) return [...values];
  const [field, direction] = Object.entries(sort)[0];
  return [...values].sort((a, b) => {
    const aValue = String(a[field] ?? "");
    const bValue = String(b[field] ?? "");
    if (aValue === bValue) return 0;
    if (direction === "asc") {
      return aValue < bValue ? -1 : 1;
    }
    return aValue > bValue ? -1 : 1;
  });
}
