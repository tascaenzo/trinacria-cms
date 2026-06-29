import assert from "node:assert/strict";
import test from "node:test";
import {
  type DbAdapter,
  type DbQuery,
  type DbRepository,
  type HttpContext,
  type NamespaceContext
} from "@trinacria-cms/kernel";
import { AuthController } from "../src/modules/auth/auth.controller.js";
import { AuthBlacklistRepository } from "../src/modules/auth/repositories/auth-blacklist.repository.js";
import { AuthLoginAttemptRepository } from "../src/modules/auth/repositories/auth-login-attempt.repository.js";
import { AuthUsersRepository } from "../src/modules/auth/repositories/auth-users.repository.js";
import { JwtAuthError, JwtAuthService } from "../src/modules/auth/services/auth.service.js";
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
import { SettingsDefinitionsRepository } from "../src/modules/settings/definitions/settings-definitions.repository.js";
import { SettingsValuesRepository } from "../src/modules/settings/values/settings-values.repository.js";
import { SettingsSecretsRepository } from "../src/modules/settings/secrets/settings-secrets.repository.js";
import { RuntimeConfigService } from "../src/modules/settings/config/runtime-config.service.js";
import { SettingsSecretsCryptoService } from "../src/modules/settings/secrets/settings-secrets-crypto.service.js";
import { SettingsService } from "../src/modules/settings/services/settings.service.js";
import { UsersRepository } from "../src/modules/users/repositories/users.repository.js";

test("JwtAuthService logs in admin and validates JWT token", async () => {
  const runtime = createRuntime();

  const bootstrap = await runtime.installation.bootstrap({
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    password: "StrongPassword123!",
    confirmPassword: "StrongPassword123!",
    siteName: "Test Site"
  });
  assert.equal(bootstrap.status.installed, true);

  const session = await runtime.auth.loginWithPassword({
    email: "admin@example.com",
    password: "StrongPassword123!"
  });
  assert.equal(session.tokenType, "Bearer");
  assert.equal(session.user.email, "admin@example.com");
  assert.ok(session.refreshToken.length > 16);
  assert.ok(session.refreshExpiresAt.length > 10);

  const authenticated = await runtime.auth.authenticateBearerToken(session.accessToken);
  assert.equal(authenticated.id, session.user.id);
});

test("JwtAuthService validates refresh token and rejects using it as access token", async () => {
  const runtime = createRuntime();

  await runtime.installation.bootstrap({
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    password: "StrongPassword123!",
    confirmPassword: "StrongPassword123!",
    siteName: "Test Site"
  });

  const session = await runtime.auth.loginWithPassword({
    email: "admin@example.com",
    password: "StrongPassword123!"
  });

  const refreshUser = await runtime.auth.authenticateRefreshToken(session.refreshToken);
  assert.equal(refreshUser.email, "admin@example.com");

  await assert.rejects(
    async () => runtime.auth.authenticateBearerToken(session.refreshToken),
    (error: unknown) => error instanceof JwtAuthError && error.code === "auth_invalid_token"
  );
});

test("JwtAuthService rejects login before installation is completed", async () => {
  const runtime = createRuntime();

  await assert.rejects(
    async () =>
      runtime.auth.loginWithPassword({
        email: "admin@example.com",
        password: "StrongPassword123!"
      }),
    (error: unknown) => error instanceof JwtAuthError && error.code === "installation_not_completed"
  );
});

test("JwtAuthService forbids non-admin token on admin-required auth", async () => {
  const runtime = createRuntime();

  await runtime.installation.bootstrap({
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    password: "StrongPassword123!",
    confirmPassword: "StrongPassword123!",
    siteName: "Test Site"
  });

  const user = await runtime.users.create({
    email: "operator@example.com",
    firstName: "Operator",
    lastName: "User"
  });
  const password = await runtime.passwordHashing.hashPassword("AnotherStrongPass123!");
  await runtime.localCredentials.upsert({
    userId: user.id,
    algorithm: password.algorithm,
    passwordHash: password.passwordHash,
    passwordSalt: password.passwordSalt
  });

  const session = await runtime.auth.loginWithPassword({
    email: "operator@example.com",
    password: "AnotherStrongPass123!"
  });

  await assert.rejects(
    async () => runtime.auth.authenticateBearerToken(session.accessToken),
    (error: unknown) =>
      error instanceof JwtAuthError && error.code === "auth_forbidden_admin_required"
  );
});

test("AuthController login route returns 401 for invalid credentials", async () => {
  const runtime = createRuntime();

  await runtime.installation.bootstrap({
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    password: "StrongPassword123!",
    confirmPassword: "StrongPassword123!",
    siteName: "Test Site"
  });

  const controller = new AuthController(runtime.auth);
  const route = controller
    .routes()
    .find((candidate) => candidate.method === "POST" && candidate.path === "/v1/auth/login");

  assert.ok(route, "Expected auth login route to be registered");

  const result = await route!.handler(
    createHttpContext({
      email: "admin@example.com",
      password: "WrongPassword123!"
    })
  );

  assert.ok(result && typeof result === "object");
  const response = result as { status?: number; body?: unknown };

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, {
    error: {
      code: "auth_invalid_credentials",
      message: "Invalid credentials"
    },
    meta: {
      pluginId: "core-pack"
    }
  });
});

test("AuthController login sets httpOnly cookies without exposing refresh token in body", async () => {
  const runtime = createRuntime();

  await runtime.installation.bootstrap({
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    password: "StrongPassword123!",
    confirmPassword: "StrongPassword123!",
    siteName: "Test Site"
  });

  const controller = new AuthController(runtime.auth);
  const route = controller
    .routes()
    .find((candidate) => candidate.method === "POST" && candidate.path === "/v1/auth/login");

  assert.ok(route, "Expected auth login route to be registered");

  const result = await route!.handler(
    createHttpContext({
      email: "admin@example.com",
      password: "StrongPassword123!"
    })
  );

  const response = result as {
    status?: number;
    body?: { data?: Record<string, unknown> };
    headers?: Record<string, unknown>;
  };

  assert.equal(response.status ?? 200, 200);
  assert.equal(typeof response.body?.data?.accessToken, "string");
  assert.equal("refreshToken" in (response.body?.data ?? {}), false);

  const setCookie = response.headers?.["set-cookie"];
  assert.ok(Array.isArray(setCookie));
  assert.equal(setCookie.length, 2);
  assert.ok(setCookie.every((header) => String(header).includes("HttpOnly")));
  assert.ok(setCookie.some((header) => String(header).startsWith("cms_access_token=")));
  assert.ok(setCookie.some((header) => String(header).startsWith("cms_refresh_token=")));
});

test("AuthController logout clears cookies and revokes refresh cookie token", async () => {
  const runtime = createRuntime();

  await runtime.installation.bootstrap({
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    password: "StrongPassword123!",
    confirmPassword: "StrongPassword123!",
    siteName: "Test Site"
  });

  const session = await runtime.auth.loginWithPassword({
    email: "admin@example.com",
    password: "StrongPassword123!"
  });

  const controller = new AuthController(runtime.auth);
  const route = controller
    .routes()
    .find((candidate) => candidate.method === "POST" && candidate.path === "/v1/auth/logout");

  assert.ok(route, "Expected auth logout route to be registered");

  const result = await route!.handler(
    createHttpContext(null, {
      cookie: `cms_refresh_token=${session.refreshToken}`
    })
  );

  const response = result as {
    status?: number;
    body?: { data?: { revoked?: boolean } };
    headers?: Record<string, unknown>;
  };

  assert.equal(response.status ?? 200, 200);
  assert.equal(response.body?.data?.revoked, true);

  const setCookie = response.headers?.["set-cookie"];
  assert.ok(Array.isArray(setCookie));
  assert.ok(setCookie.every((header) => String(header).includes("Max-Age=0")));

  await assert.rejects(
    async () => runtime.auth.authenticateRefreshToken(session.refreshToken),
    (error: unknown) => error instanceof JwtAuthError && error.code === "auth_token_revoked"
  );
});

test("AuthController updates the authenticated user profile", async () => {
  const runtime = createRuntime();

  await runtime.installation.bootstrap({
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    password: "StrongPassword123!",
    confirmPassword: "StrongPassword123!",
    siteName: "Test Site"
  });

  const session = await runtime.auth.loginWithPassword({
    email: "admin@example.com",
    password: "StrongPassword123!"
  });

  const controller = new AuthController(runtime.auth);
  const route = controller
    .routes()
    .find((candidate) => candidate.method === "PATCH" && candidate.path === "/v1/auth/me");

  assert.ok(route, "Expected auth profile update route to be registered");

  const ctx = createHttpContext(
    { firstName: "Admin", lastName: "Renamed" },
    { authorization: `Bearer ${session.accessToken}` }
  );
  const middlewareResult = await route!.middlewares?.[0]?.(ctx, async () => route!.handler(ctx));
  const response = middlewareResult as {
    status?: number;
    body?: { data?: { firstName?: string; lastName?: string } };
    data?: { firstName?: string; lastName?: string };
  };

  assert.equal(response.status ?? 200, 200);
  assert.equal((response.body ?? response).data?.firstName, "Admin");
  assert.equal((response.body ?? response).data?.lastName, "Renamed");

  const authenticated = await runtime.auth.authenticateBearerToken(session.accessToken);
  assert.equal(authenticated.firstName, "Admin");
  assert.equal(authenticated.lastName, "Renamed");
});

test("AuthController changes the authenticated user password", async () => {
  const runtime = createRuntime();

  await runtime.installation.bootstrap({
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    password: "StrongPassword123!",
    confirmPassword: "StrongPassword123!",
    siteName: "Test Site"
  });

  const session = await runtime.auth.loginWithPassword({
    email: "admin@example.com",
    password: "StrongPassword123!"
  });

  const controller = new AuthController(runtime.auth);
  const route = controller
    .routes()
    .find((candidate) => candidate.method === "PATCH" && candidate.path === "/v1/auth/me/password");

  assert.ok(route, "Expected auth password update route to be registered");

  const ctx = createHttpContext(
    {
      currentPassword: "StrongPassword123!",
      newPassword: "NewStrongPassword123!"
    },
    { authorization: `Bearer ${session.accessToken}` }
  );
  const middlewareResult = await route!.middlewares?.[0]?.(ctx, async () => route!.handler(ctx));
  const response = middlewareResult as {
    status?: number;
    body?: { data?: { email?: string } };
    data?: { email?: string };
  };

  assert.equal(response.status ?? 200, 200);
  assert.equal((response.body ?? response).data?.email, "admin@example.com");

  await assert.rejects(
    async () =>
      runtime.auth.loginWithPassword({
        email: "admin@example.com",
        password: "StrongPassword123!"
      }),
    (error: unknown) => error instanceof JwtAuthError && error.code === "auth_invalid_credentials"
  );

  const nextSession = await runtime.auth.loginWithPassword({
    email: "admin@example.com",
    password: "NewStrongPassword123!"
  });
  assert.equal(nextSession.user.email, "admin@example.com");
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
  const settings = new SettingsService(
    new SettingsDefinitionsRepository(db),
    new SettingsValuesRepository(db),
    new SettingsSecretsRepository(db),
    new SettingsSecretsCryptoService()
  );
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
    permissions,
    userRoles,
    settings
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
    settings
  );
  const config = new RuntimeConfigService(db, {
    info: () => {},
    warn: () => {},
    error: () => {}
  });

  const auth = new JwtAuthService(
    new AuthUsersRepository(db),
    localCredentials,
    installationState,
    passwordHashing,
    new AuthBlacklistRepository(db),
    new AuthLoginAttemptRepository(db),
    config,
    db
  );

  return {
    auth,
    installation,
    users,
    localCredentials,
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
    repository<TData>(entityName: string, context: NamespaceContext): DbRepository<TData> {
      return repository(`${context.pluginId}:${entityName}`) as unknown as DbRepository<TData>;
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

function createHttpContext(body: unknown, headers: Record<string, string> = {}): HttpContext {
  const abortController = new AbortController();

  return {
    req: { headers } as HttpContext["req"],
    res: {} as HttpContext["res"],
    params: {},
    query: {},
    body,
    signal: abortController.signal,
    abort(reason?: unknown) {
      abortController.abort(reason);
    },
    state: {}
  };
}
