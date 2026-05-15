import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository } from "@trinacria-cms/kernel";
import { LocalCredentialsRepository } from "../src/modules/installation/local-credentials.repository.js";
import {
  InstallationAlreadyCompletedError,
  InstallationService
} from "../src/modules/installation/installation.service.js";
import { InstallationStateRepository } from "../src/modules/installation/installation-state.repository.js";
import { PasswordHashingService } from "../src/modules/installation/password-hashing.service.js";
import { PermissionsRepository } from "../src/modules/permissions/permissions.repository.js";
import { RoleGrantsRepository } from "../src/modules/roles/grants/role-grants.repository.js";
import { RolesRepository } from "../src/modules/roles/roles.repository.js";
import { CorePackSecurityProvisioningService } from "../src/modules/security/security-provisioning.service.js";
import { RolePolicyRulesRepository } from "../src/modules/security/role-policy-rules/role-policy-rules.repository.js";
import { UserAccessService } from "../src/modules/security/user-access/user-access.service.js";
import { UserRolesRepository } from "../src/modules/security/user-access/user-roles.repository.js";
import { UsersRepository } from "../src/modules/users/users.repository.js";

test("InstallationService reports not-installed status by default", async () => {
  const runtime = createInstallationRuntime();
  const status = await runtime.service.getStatus();

  assert.equal(status.installed, false);
  assert.equal(status.installedAt, undefined);
  assert.equal(status.adminUserId, undefined);
});

test("InstallationService bootstraps admin user and local credentials", async () => {
  const runtime = createInstallationRuntime();

  const result = await runtime.service.bootstrap({
    email: "admin@example.com",
    displayName: "CMS Admin",
    password: "StrongerPass123!"
  });

  assert.equal(result.status.installed, true);
  assert.equal(result.adminUser.email, "admin@example.com");
  assert.equal(result.adminUser.displayName, "CMS Admin");
  assert.equal(result.adminUser.status, "active");
  assert.equal(result.status.adminUserId, result.adminUser.id);

  const state = await runtime.installationState.get();
  assert.equal(state?.installed, true);
  assert.equal(state?.adminUserId, result.adminUser.id);

  const credentials = await runtime.localCredentials.findByUserId(result.adminUser.id);
  assert.ok(credentials);
  assert.equal(credentials?.algorithm, "scrypt-v1");
  assert.ok(credentials?.passwordHash);
  assert.ok(credentials?.passwordSalt);

  const validPassword = await runtime.passwordHashing.verifyPassword("StrongerPass123!", {
    algorithm: credentials?.algorithm ?? "scrypt-v1",
    passwordHash: credentials?.passwordHash ?? "",
    passwordSalt: credentials?.passwordSalt ?? ""
  });
  assert.equal(validPassword, true);

  const roles = await runtime.userAccess.listUserRoles(result.adminUser.id);
  assert.ok(roles.some((item) => item.roleCode === "admin"));
});

test("InstallationService blocks bootstrap when installation is already completed", async () => {
  const runtime = createInstallationRuntime();

  await runtime.service.bootstrap({
    email: "admin@example.com",
    displayName: "CMS Admin",
    password: "StrongerPass123!"
  });

  await assert.rejects(
    async () =>
      runtime.service.bootstrap({
        email: "another-admin@example.com",
        displayName: "Another Admin",
        password: "AnotherStrongPass123!"
      }),
    (error) =>
      error instanceof InstallationAlreadyCompletedError &&
      error.code === "installation_already_completed"
  );
});

interface InstallationRuntime {
  service: InstallationService;
  installationState: InstallationStateRepository;
  localCredentials: LocalCredentialsRepository;
  userAccess: UserAccessService;
  passwordHashing: PasswordHashingService;
}

function createInstallationRuntime(): InstallationRuntime {
  const db = createFakeDbAdapter();
  const users = new UsersRepository(db);
  const roles = new RolesRepository(db);
  const roleGrants = new RoleGrantsRepository(db);
  const rolePolicyRules = new RolePolicyRulesRepository(db);
  const permissions = new PermissionsRepository(db);
  const userRoles = new UserRolesRepository(db);
  const userAccess = new UserAccessService(
    users,
    roles,
    roleGrants,
    rolePolicyRules,
    permissions,
    userRoles
  );
  const securityProvisioning = new CorePackSecurityProvisioningService(
    roles,
    roleGrants,
    rolePolicyRules,
    permissions,
    userRoles
  );
  const installationState = new InstallationStateRepository(db);
  const localCredentials = new LocalCredentialsRepository(db);
  const passwordHashing = new PasswordHashingService();

  return {
    service: new InstallationService(
      installationState,
      localCredentials,
      users,
      userAccess,
      securityProvisioning,
      passwordHashing
    ),
    installationState,
    localCredentials,
    userAccess,
    passwordHashing
  };
}

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

  const repository = <TData extends Record<string, unknown>>(key: string): DbRepository<TData> => ({
    async findOne(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const found = bucket.find((item) => matchesFilter(item, query.filter)) ?? null;
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
      const updated = { ...bucket[index], ...patch } as TData;
      bucket[index] = updated;
      return updated;
    },
    async deleteOne(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const index = bucket.findIndex((item) => matchesFilter(item, query.filter));
      if (index < 0) return false;
      bucket.splice(index, 1);
      return true;
    }
  });

  return {
    repository(entityName, context) {
      return repository(`${context.pluginId}:${entityName}`);
    },
    async beginTransaction() {
      return {
        async commit() {},
        async rollback() {}
      };
    },
    async healthCheck() {
      return { ok: true };
    }
  };
}

function matchesFilter(
  item: Record<string, unknown>,
  filter: Record<string, unknown> | undefined
): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([key, value]) => item[key] === value);
}

function applySort<TData extends Record<string, unknown>>(
  values: readonly TData[],
  sort: Record<string, "asc" | "desc"> | undefined
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
