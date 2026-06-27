import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository, NamespaceContext } from "@trinacria-cms/kernel";
import { SettingsDefinitionsRepository } from "../src/modules/settings/definitions/settings-definitions.repository.js";
import { SettingsAccessError } from "../src/modules/settings/_shared/settings.errors.js";
import { SettingsSecretsCryptoService } from "../src/modules/settings/secrets/settings-secrets-crypto.service.js";
import { SettingsSecretsRepository } from "../src/modules/settings/secrets/settings-secrets.repository.js";
import { provisionCorePackSettingDefinitions } from "../src/modules/settings/settings.bootstrap.js";
import { SettingsService } from "../src/modules/settings/settings.service.js";
import { SettingsValuesRepository } from "../src/modules/settings/values/settings-values.repository.js";

test("SettingsService resolves defaults and explicit values", async () => {
  const service = createSettingsService();

  await service.upsertDefinition({
    requesterPluginId: "core-pack",
    key: "core-pack:privacy:consents",
    category: "privacy",
    defaultValue: {
      cookieBanner: { enabled: true, mode: "opt-in" },
      retentionDays: 365
    }
  });

  const fromDefault = await service.getResolvedValueByKey("core-pack:privacy:consents");
  assert.ok(fromDefault);
  assert.equal(fromDefault?.source, "default");
  assert.deepEqual(fromDefault?.value, {
    cookieBanner: { enabled: true, mode: "opt-in" },
    retentionDays: 365
  });

  const upserted = await service.upsertValue({
    requesterPluginId: "core-pack",
    key: "core-pack:privacy:consents",
    value: {
      cookieBanner: { enabled: false, mode: "opt-out" },
      retentionDays: 180
    }
  });

  assert.equal(upserted.version, 1);

  const fromValue = await service.getResolvedValueByKey("core-pack:privacy:consents");
  assert.ok(fromValue);
  assert.equal(fromValue?.source, "value");
  assert.equal(fromValue?.version, 1);
  assert.deepEqual(fromValue?.value, {
    cookieBanner: { enabled: false, mode: "opt-out" },
    retentionDays: 180
  });
});

test("SettingsService masks secrets and enforces owner-only reveal", async () => {
  const service = createSettingsService();

  await service.upsertDefinition({
    requesterPluginId: "core-pack",
    key: "core-pack:integrations:stripe_api_key",
    secret: true,
    status: "active"
  });

  await service.upsertSecret({
    requesterPluginId: "core-pack",
    key: "core-pack:integrations:stripe_api_key",
    plaintext: "sk_test_123456"
  });

  const metadata = await service.getSecretMetadata(
    "core-pack",
    "core-pack:integrations:stripe_api_key"
  );
  assert.ok(metadata);
  assert.equal(metadata?.maskedValue, "********");

  const adminMetadata = await service.getSecretMetadataByKey(
    "core-pack:integrations:stripe_api_key"
  );
  assert.ok(adminMetadata);
  assert.equal(adminMetadata?.maskedValue, "********");

  const revealed = await service.revealSecret("core-pack", "core-pack:integrations:stripe_api_key");
  assert.ok(revealed);
  assert.equal(revealed?.value, "sk_test_123456");

  await assertSettingsAccessError(
    () => service.getSecretMetadata("blog-pack", "core-pack:integrations:stripe_api_key"),
    "auth_forbidden_settings_owner_required"
  );

  await assertSettingsAccessError(
    () => service.revealSecret("blog-pack", "core-pack:integrations:stripe_api_key"),
    "auth_forbidden_settings_owner_required"
  );

  const exported = await service.exportPluginSettings("core-pack", "core-pack");
  assert.equal(exported.pluginId, "core-pack");
  assert.equal(exported.secrets.length, 1);
  assert.equal(exported.secrets[0]?.maskedValue, "********");

  await assertSettingsAccessError(
    () => service.exportPluginSettings("blog-pack", "core-pack"),
    "auth_forbidden_settings_owner_required"
  );
});

test("SettingsService enforces definition policies for value and secret writes", async () => {
  const service = createSettingsService();

  await service.upsertDefinition({
    requesterPluginId: "core-pack",
    key: "core-pack:security:api_secret",
    secret: true,
    mutable: true,
    status: "active"
  });

  await assert.rejects(
    () =>
      service.upsertValue({
        requesterPluginId: "core-pack",
        key: "core-pack:security:api_secret",
        value: "plain"
      }),
    /secret and cannot be written via value endpoint/
  );

  await service.upsertSecret({
    requesterPluginId: "core-pack",
    key: "core-pack:security:api_secret",
    plaintext: "encrypted-value"
  });

  await service.upsertDefinition({
    requesterPluginId: "core-pack",
    key: "core-pack:features:immutable_flag",
    mutable: false,
    status: "active"
  });
  await assert.rejects(
    () =>
      service.upsertValue({
        requesterPluginId: "core-pack",
        key: "core-pack:features:immutable_flag",
        value: true
      }),
    /immutable/
  );
});

test("SettingsService exposes and patches grouped non-secret settings", async () => {
  const service = createSettingsService();

  await service.upsertDefinition({
    requesterPluginId: "core-pack",
    key: "core-pack:auth:jwt_access_ttl_seconds",
    category: "auth",
    defaultValue: 900,
    status: "active"
  });
  await service.upsertDefinition({
    requesterPluginId: "core-pack",
    key: "core-pack:auth:jwt_refresh_ttl_seconds",
    category: "auth",
    defaultValue: 604800,
    status: "active"
  });
  await service.upsertDefinition({
    requesterPluginId: "core-pack",
    key: "core-pack:settings:master_key",
    category: "auth",
    secret: true,
    status: "active"
  });

  const groups = await service.listGroups({ ownerPluginId: "core-pack" });
  assert.deepEqual(groups, [
    {
      id: "auth",
      label: "Auth",
      ownerPluginIds: ["core-pack"],
      definitionCount: 3,
      editableCount: 2,
      secretCount: 1
    }
  ]);

  const initial = await service.getGroupById("auth", { ownerPluginId: "core-pack" });
  assert.ok(initial);
  assert.deepEqual(initial?.values, {
    "auth.jwt_access_ttl_seconds": 900,
    "auth.jwt_refresh_ttl_seconds": 604800
  });
  assert.equal(initial?.fields.length, 3);
  assert.equal(
    initial?.fields.find((field) => field.fieldId === "settings.master_key")?.definition.secret,
    true
  );

  const result = await service.upsertGroupValues({
    requesterPluginId: "core-pack",
    groupId: "auth",
    values: {
      "auth.jwt_access_ttl_seconds": 1200,
      "auth.jwt_refresh_ttl_seconds": 1209600
    }
  });

  assert.equal(result.updated.length, 2);
  assert.deepEqual(result.group.values, {
    "auth.jwt_access_ttl_seconds": 1200,
    "auth.jwt_refresh_ttl_seconds": 1209600
  });

  await assert.rejects(
    () =>
      service.upsertGroupValues({
        requesterPluginId: "core-pack",
        groupId: "auth",
        values: {
          "settings.master_key": "plain-secret"
        }
      }),
    /secret and cannot be written via group endpoint/
  );
});

test("core-pack settings bootstrap provisions user lifecycle flow settings", async () => {
  const service = createSettingsService();

  await provisionCorePackSettingDefinitions(service);

  const group = await service.getGroupById("user_flows", { ownerPluginId: "core-pack" });
  assert.ok(group);
  assert.equal(group?.label, "User Flows");
  assert.equal(
    group?.fields.some((field) => field.key === "core-pack:user_flows:public_registration_enabled"),
    true
  );
  assert.equal(
    group?.fields.some((field) => field.key === "core-pack:user_flows:user_invites_enabled"),
    true
  );
  assert.equal(
    group?.fields.some((field) => field.key === "core-pack:user_flows:password_reset_enabled"),
    true
  );
  assert.equal(
    group?.fields.some((field) => field.key === "core-pack:user_flows:email_verification_required"),
    true
  );
  assert.deepEqual(group?.values["user_flows.public_registration_enabled"], false);
  assert.deepEqual(group?.values["user_flows.user_invites_enabled"], true);
  assert.deepEqual(group?.values["user_flows.password_reset_enabled"], true);
  assert.deepEqual(group?.values["user_flows.notification_locale"], "it");
});

async function assertSettingsAccessError(
  action: () => Promise<unknown>,
  expectedCode: string
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof SettingsAccessError);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

function createSettingsService(): SettingsService {
  return createSettingsRuntime().service;
}

function createSettingsRuntime(): { service: SettingsService; db: DbAdapter } {
  const db = createFakeDbAdapter();
  const definitions = new SettingsDefinitionsRepository(db);
  const values = new SettingsValuesRepository(db);
  const secrets = new SettingsSecretsRepository(db);
  const crypto = new SettingsSecretsCryptoService({
    masterKey: "test-master-key",
    keyVersion: "test-v1"
  });

  return {
    service: new SettingsService(definitions, values, secrets, crypto),
    db
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
      const updated = {
        ...bucket[index],
        ...patch
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
  const [field, direction] = Object.entries(sort)[0]!;
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
