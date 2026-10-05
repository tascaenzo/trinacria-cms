import assert from "node:assert/strict";
import test from "node:test";
import type {
  DbAdapter,
  DbQuery,
  DbRepository,
  NamespaceContext,
  PluginManifest,
  InstallationHost,
} from "@trinacria-cms/kernel";
import { InstallationAlreadyCompletedError } from "../src/modules/installation/services/installation.service.js";
import { createInstallationRuntime as createDomainRuntime } from "./_shared/installation-runtime.js";
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
    firstName: "CMS",
    lastName: "Admin",
    confirmPassword: "StrongerPass123!",
    password: "StrongerPass123!",
    siteName: "My Site",
    siteTagline: "Editorial operations",
    locale: "it-IT",
    timezone: "Europe/Rome",
  });

  assert.equal(result.status.installed, true);
  assert.equal(result.adminUser.email, "admin@example.com");
  assert.equal(result.adminUser.firstName, "CMS");
  assert.equal(result.adminUser.lastName, "Admin");
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
    passwordSalt: credentials?.passwordSalt ?? "",
  });
  assert.equal(validPassword, true);

  const roles = await runtime.userAccess.listUserRoles(result.adminUser.id);
  assert.ok(roles.some((item) => item.roleCode === "admin"));

  const provisionedRoles = await runtime.roles.list();
  assert.deepEqual(provisionedRoles.map((role) => role.code).sort(), ["admin", "editor", "viewer"]);

  assert.equal(
    (await runtime.settings.getResolvedValueByKey("core-pack:site:name"))?.value,
    "My Site",
  );
  assert.equal(
    (await runtime.settings.getResolvedValueByKey("core-pack:branding:tagline"))?.value,
    "Editorial operations",
  );
  assert.equal(
    (await runtime.settings.getResolvedValueByKey("core-pack:cms:locale"))?.value,
    "it-IT",
  );
  assert.equal(
    (await runtime.settings.getResolvedValueByKey("core-pack:cms:timezone"))?.value,
    "Europe/Rome",
  );
});

test("InstallationService provisions security for plugins already loaded in setup mode", async () => {
  const extensionManifest: PluginManifest = {
    id: "extension-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    security: {
      permissions: [
        {
          key: "extension-pack:settings:read",
          resource: "settings",
          action: "read",
          displayName: "Read extension settings",
        },
      ],
      grants: [
        {
          roleCode: "admin",
          permissionKeys: ["extension-pack:settings:read"],
        },
      ],
    },
  };
  const runtime = createInstallationRuntime(extensionManifest);

  const result = await runtime.service.bootstrap({
    email: "admin@example.com",
    firstName: "CMS",
    lastName: "Admin",
    confirmPassword: "StrongerPass123!",
    password: "StrongerPass123!",
    siteName: "My Site",
  });

  const permissions = await runtime.userAccess.resolveUserPermissions(result.adminUser.id);
  assert.ok(permissions.includes("extension-pack:settings:read"));
});

test("InstallationService blocks bootstrap when installation is already completed", async () => {
  const runtime = createInstallationRuntime();

  await runtime.service.bootstrap({
    email: "admin@example.com",
    firstName: "CMS",
    lastName: "Admin",
    confirmPassword: "StrongerPass123!",
    password: "StrongerPass123!",
    siteName: "My Site",
  });

  await assert.rejects(
    async () =>
      runtime.service.bootstrap({
        email: "another-admin@example.com",
        firstName: "Another",
        lastName: "Admin",
        confirmPassword: "AnotherStrongPass123!",
        password: "AnotherStrongPass123!",
        siteName: "My Site",
      }),
    (error) =>
      error instanceof InstallationAlreadyCompletedError &&
      error.code === "installation_already_completed",
  );
});

test("InstallationService rejects password mismatch", async () => {
  const runtime = createInstallationRuntime();

  await assert.rejects(
    () =>
      runtime.service.bootstrap({
        email: "admin@example.com",
        firstName: "CMS",
        lastName: "Admin",
        password: "StrongerPass123!",
        confirmPassword: "DifferentPass123!",
        siteName: "My Site",
      }),
    { code: "password_mismatch" },
  );
});

const retryInput = {
  email: "retry@example.test",
  firstName: "Admin",
  lastName: "Retry",
  password: "RetryPassword123!",
  confirmPassword: "RetryPassword123!",
  siteName: "Retry site",
  dataMode: "demo" as const,
};
test("installation preserves the checkpoint, rejects takeover and resumes with one admin", async () => {
  let fail = true,
    initialized = 0;
  const runtime = createInstallationRuntime(undefined, {
    inspect: async () => ({ checks: [] }),
    verify: async () => [],
    async initialize() {
      initialized++;
      if (fail) throw new Error("Demo interrupted");
    },
  });
  await assert.rejects(runtime.service.bootstrap(retryInput), /Demo interrupted/);
  const interrupted = await runtime.installationState.get();
  assert.equal(interrupted?.phase, "content");
  assert.equal(interrupted?.installed, false);
  await assert.rejects(runtime.service.bootstrap({ ...retryInput, email: "other@example.test" }), {
    code: "installation_resume_mismatch",
  });
  await assert.rejects(
    runtime.service.bootstrap({
      ...retryInput,
      password: "DifferentPassword123!",
      confirmPassword: "DifferentPassword123!",
    }),
    { code: "installation_resume_mismatch" },
  );
  fail = false;
  const completed = await runtime.service.bootstrap(retryInput);
  assert.equal(completed.adminUser.id, interrupted?.adminUserId);
  assert.equal(completed.status.phase, "complete");
  assert.equal(initialized, 2);
});
test("required settings failures never produce a completed installation", async () => {
  const runtime = createInstallationRuntime();
  runtime.settings.upsertValue = async () => {
    throw new Error("Settings unavailable");
  };
  await assert.rejects(runtime.service.bootstrap(retryInput), /Settings unavailable/);
  assert.equal((await runtime.installationState.get())?.installed, false);
});
test("failed prerequisites block bootstrap and failed final checks preserve retry state", async () => {
  let blocked = true;
  const runtime = createInstallationRuntime(undefined, {
    inspect: async () => ({
      checks: [
        { id: "transactions", status: blocked ? "fail" : "pass", message: "transactions-ready" },
      ],
    }),
    initialize: async () => {},
    verify: async () => [{ id: "services", status: "fail", message: "services-not-ready" }],
  });
  assert.equal((await runtime.service.getStatus()).canInstall, false);
  await assert.rejects(runtime.service.bootstrap(retryInput), { code: "platform_maintenance" });
  assert.equal(await runtime.installationState.get(), null);
  blocked = false;
  await assert.rejects(runtime.service.bootstrap(retryInput), { code: "platform_maintenance" });
  assert.equal((await runtime.installationState.get())?.phase, "verification");
  assert.equal((await runtime.installationState.get())?.installed, false);
});

function createInstallationRuntime(manifest?: PluginManifest, host?: InstallationHost) {
  return createDomainRuntime(createFakeDbAdapter(), manifest, host);
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
    },
  });

  return {
    repository<TData>(entityName: string, context: NamespaceContext): DbRepository<TData> {
      return repository(`${context.pluginId}:${entityName}`) as unknown as DbRepository<TData>;
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
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && "$lte" in value)
      return (item[key] as Date) <= (value as { $lte: Date }).$lte;
    if (value && typeof value === "object" && "$gt" in value)
      return (item[key] as Date) > (value as { $gt: Date }).$gt;
    return item[key] === value;
  });
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
