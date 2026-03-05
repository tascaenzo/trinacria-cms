import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository } from "@trinacria-cms/kernel";
import { AuthUsersRepository } from "../src/modules/auth/auth-users.repository.js";
import { JwtAuthError, JwtAuthService } from "../src/modules/auth/auth.service.js";
import { LocalCredentialsRepository } from "../src/modules/installation/local-credentials.repository.js";
import { InstallationService } from "../src/modules/installation/installation.service.js";
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

test("JwtAuthService logs in admin and validates JWT token", async () => {
  const runtime = createRuntime();

  const bootstrap = await runtime.installation.bootstrap({
    email: "admin@example.com",
    displayName: "Admin",
    password: "StrongPassword123!",
  });
  assert.equal(bootstrap.status.installed, true);

  const session = await runtime.auth.loginWithPassword({
    email: "admin@example.com",
    password: "StrongPassword123!",
  });
  assert.equal(session.tokenType, "Bearer");
  assert.equal(session.user.email, "admin@example.com");

  const authenticated = await runtime.auth.authenticateBearerToken(
    session.accessToken,
  );
  assert.equal(authenticated.id, session.user.id);
});

test("JwtAuthService rejects login before installation is completed", async () => {
  const runtime = createRuntime();

  await assert.rejects(
    async () =>
      runtime.auth.loginWithPassword({
        email: "admin@example.com",
        password: "StrongPassword123!",
      }),
    (error) =>
      error instanceof JwtAuthError && error.code === "installation_not_completed",
  );
});

test("JwtAuthService forbids non-admin token on admin-required auth", async () => {
  const runtime = createRuntime();

  await runtime.installation.bootstrap({
    email: "admin@example.com",
    displayName: "Admin",
    password: "StrongPassword123!",
  });

  const user = await runtime.users.create({
    email: "operator@example.com",
    displayName: "Operator",
  });
  const password = await runtime.passwordHashing.hashPassword("AnotherStrongPass123!");
  await runtime.localCredentials.upsert({
    userId: user.id,
    algorithm: password.algorithm,
    passwordHash: password.passwordHash,
    passwordSalt: password.passwordSalt,
  });

  const session = await runtime.auth.loginWithPassword({
    email: "operator@example.com",
    password: "AnotherStrongPass123!",
  });

  await assert.rejects(
    async () => runtime.auth.authenticateBearerToken(session.accessToken),
    (error) =>
      error instanceof JwtAuthError &&
      error.code === "auth_forbidden_admin_required",
  );
});

interface Runtime {
  auth: JwtAuthService;
  installation: InstallationService;
  users: UsersRepository;
  localCredentials: LocalCredentialsRepository;
  passwordHashing: PasswordHashingService;
}

function createRuntime(): Runtime {
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
    userRoles,
  );
  const securityProvisioning = new CorePackSecurityProvisioningService(
    roles,
    roleGrants,
    rolePolicyRules,
    permissions,
    userRoles,
  );
  const installationState = new InstallationStateRepository(db);
  const localCredentials = new LocalCredentialsRepository(db);
  const passwordHashing = new PasswordHashingService();
  const installation = new InstallationService(
    installationState,
    localCredentials,
    users,
    userAccess,
    securityProvisioning,
    passwordHashing,
  );
  const auth = new JwtAuthService(
    new AuthUsersRepository(db),
    localCredentials,
    installationState,
    passwordHashing,
  );

  return {
    auth,
    installation,
    users,
    localCredentials,
    passwordHashing,
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

  const repository = <TData extends Record<string, unknown>>(
    key: string,
  ): DbRepository<TData> => ({
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
