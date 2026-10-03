import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository, NamespaceContext } from "@trinacria-cms/kernel";
import { TrinacriaApp, valueProvider } from "@trinacria/core";
import { createEventsPlugin } from "@trinacria/events";
import { InMemoryPluginRuntime } from "@trinacria-cms/kernel/runtime";
import { CORE_TOKENS } from "@trinacria-cms/kernel/tokens";
import { SettingsDefinitionsRepository } from "../src/modules/settings/definitions/settings-definitions.repository.js";
import { SettingsSecretsCryptoService } from "../src/modules/settings/secrets/settings-secrets-crypto.service.js";
import {
  CORE_PACK_SETTING_DEFINITION_SEEDS,
  provisionCorePackSettingDefinitions
} from "../src/modules/settings/settings.bootstrap.js";
import { SettingsSecretsRepository } from "../src/modules/settings/secrets/settings-secrets.repository.js";
import { SettingsService } from "../src/modules/settings/services/settings.service.js";
import { SettingsValuesRepository } from "../src/modules/settings/values/settings-values.repository.js";
import { CORE_PACK_MANIFEST } from "../src/plugin/core-pack.manifest.js";

test("core-pack settings bootstrap provisions the canonical seed catalog", async () => {
  const service = createSettingsService();

  const created = await provisionCorePackSettingDefinitions(service);
  const listed = await service.listDefinitions({ ownerPluginId: "core-pack" });

  assert.equal(created.length, CORE_PACK_SETTING_DEFINITION_SEEDS.length);
  assert.equal(listed.length, CORE_PACK_SETTING_DEFINITION_SEEDS.length);
  assert.deepEqual(
    listed.map((item) => item.key).sort(),
    CORE_PACK_SETTING_DEFINITION_SEEDS.map((item) => item.key).sort()
  );

  const siteName = await service.getResolvedValueByKey("core-pack:site:name");
  const timezone = await service.getResolvedValueByKey("core-pack:cms:timezone");
  const dashboardLayout = await service.getResolvedValueByKey("core-pack:dashboard:widget_layout");
  const backofficeTheme = await service.getResolvedValueByKey(
    "core-pack:branding:backoffice_theme"
  );
  const backofficeAccent = await service.getResolvedValueByKey(
    "core-pack:branding:backoffice_accent"
  );

  assert.equal(siteName?.value, "Trinacria CMS");
  assert.equal(timezone?.value, "Europe/Rome");
  assert.equal(await service.getResolvedValueByKey("core-pack:security:plugin_access_grants"), null);
  assert.deepEqual(dashboardLayout?.value, {
    version: 2,
    order: [],
    hidden: [],
    dimensions: {}
  });
  assert.equal(backofficeTheme?.value, "light");
  assert.equal(backofficeAccent?.value, "neutral");
});

test("core-pack manifest exposes the canonical settings catalog", () => {
  assert.deepEqual(
    (CORE_PACK_MANIFEST.settings ?? []).map((item) => item.key).sort(),
    CORE_PACK_SETTING_DEFINITION_SEEDS.map((item) => item.key).sort()
  );

  const publicRegistration = (CORE_PACK_MANIFEST.settings ?? []).find(
    (item) => item.key === "core-pack:user_flows:public_registration_enabled"
  );
  assert.equal(publicRegistration?.category, "user_flows");
  assert.equal(publicRegistration?.defaultValue, false);
});

test("core-pack manifest declares public user lifecycle events", () => {
  assert.deepEqual((CORE_PACK_MANIFEST.events?.emits ?? []).map((event) => event.name).sort(), [
    "secure-event-payload-ready",
    "user-created",
    "user-invite-accepted",
    "user-invited",
    "user-profile-updated",
    "user-status-changed"
  ]);
});


test("scoped runtime settings never reveal secrets or accept another owner", async (t) => {
  const settings = createSettingsService();
  await provisionCorePackSettingDefinitions(settings);
  const app = new TrinacriaApp();
  app.registerGlobalProvider(valueProvider(CORE_TOKENS.PLUGIN_SETTINGS_HOST, {
    async get(pluginId: string, key: string) { return (await settings.getResolvedValueForPlugin(pluginId, key))?.value ?? null; },
    async set(pluginId: string, key: string, value: any) { await settings.upsertValue({ requesterPluginId: pluginId, key, value }); }
  }));
  await app.start(); t.after(() => app.shutdown());
  let services!: import("@trinacria-cms/kernel/contracts").PluginHostServices;
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });
  await runtime.register({ manifest: { id: "core-pack", version: "0.1.0", requiresCore: "^0.1.0", settings: [...(CORE_PACK_MANIFEST.settings ?? []), { key: "core-pack:test:secret", category: "test", visibility: "internal", secret: true }] },
    onLoad(context) { services = context.services; } });
  await runtime.load("core-pack");
  assert.equal(await services.settings.get("core-pack:site:name"), "Trinacria CMS");
  const secret = { key: "core-pack:test:secret" };
  await settings.upsertDefinition({ requesterPluginId: "core-pack", key: secret.key, secret: true, visibility: "internal", mutable: true });
  await settings.upsertSecret({ requesterPluginId: "core-pack", key: secret.key, plaintext: "never-return-this" });
  await assert.rejects(services.settings.get(secret.key), /secret/);
  await assert.rejects(services.settings.set(secret.key, "cannot-replace-secret"), /secret/);
  await assert.rejects(services.settings.get("email-pack:email:password"), /not owned/);
});



function createSettingsService(): SettingsService {
  const db = createFakeDbAdapter();
  const definitions = new SettingsDefinitionsRepository(db);
  const values = new SettingsValuesRepository(db);
  const secrets = new SettingsSecretsRepository(db);
  const crypto = new SettingsSecretsCryptoService({
    masterKey: "test-master-key",
    keyVersion: "test-v1"
  });

  return new SettingsService(definitions, values, secrets, crypto);
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
