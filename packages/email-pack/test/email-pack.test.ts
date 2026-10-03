import { randomBytes } from "node:crypto";
import { matchesMongoFilter } from "../../../test/helpers/mongo-like-filter.js";
import assert from "node:assert/strict";
import test from "node:test";
import { TrinacriaApp, defineModule, valueProvider } from "@trinacria/core";
import { type PluginHostServices } from "@trinacria-cms/kernel";
import { InMemoryPluginRuntime } from "@trinacria-cms/kernel/runtime";
import { EMAIL_OPERATIONS } from "../src/plugin/email-pack.operations.js";
import {
  CORE_TOKENS,
  type DbAdapter,
  type DbQuery,
  type DbRepository,
  type NamespaceContext
} from "@trinacria-cms/kernel";
import { SecureEventPayloadCrypto, SecureEventPayloadsRepository, SecureEventPayloadsService } from "@trinacria-cms/kernel/runtime";
import { RuntimeConfigService, SettingsDefinitionsRepository, SettingsSecretsCryptoService, SettingsSecretsRepository, SettingsService, SettingsValuesRepository } from "@trinacria-cms/core-pack/runtime";
import { EmailConfigService } from "../src/modules/email/services/email-config.service.js";
import {
  EMAIL_SEND_REQUEST_PAYLOAD_TYPE,
  EMAIL_SEND_REQUEST_SCHEMA_VERSION
} from "../src/modules/email/email-request.types.js";
import { EMAIL_DELIVERY_OPERATIONS, createEmailDeliveryOperations } from "../src/operations/email-operations.js";
import { CoreOperationAuthorizer } from "@trinacria-cms/core-pack/runtime";
import { EMAIL_PACK_SETTING_DEFINITIONS } from "../src/modules/email/email-settings.js";
import { EmailTemplatesRepository } from "../src/modules/email-templates/repositories/email-templates.repository.js";
import { EmailTemplatesService } from "../src/modules/email-templates/services/email-templates.service.js";
import { EMAIL_TEMPLATES_SERVICE_TOKEN } from "../src/modules/email-templates/email-templates.tokens.js";
import { EMAIL_PACK_MANIFEST } from "../src/plugin/email-pack.manifest.js";
import { createEmailPackPlugin } from "../src/plugin/email-pack.plugin.js";

test("email-pack manifest owns provider settings and subscribes to secure payload events", () => {
  assert.deepEqual(
    (EMAIL_PACK_MANIFEST.settings ?? []).map((item) => item.key).sort(),
    EMAIL_PACK_SETTING_DEFINITIONS.map((item) => item.key).sort()
  );
  assert.equal(
    EMAIL_PACK_MANIFEST.events?.subscribes?.[0]?.eventName,
    "*:secure-event-payload-ready"
  );
  assert.equal(EMAIL_PACK_MANIFEST.events?.subscribes?.[0]?.handler, "deliverEmailRequest");
  assert.equal(
    EMAIL_PACK_MANIFEST.admin?.settingsSections?.[0]?.requiredPermission,
    "email-pack:settings:read"
  );
  assert.deepEqual(
    (EMAIL_PACK_MANIFEST.security?.grants ?? []).find((grant) => grant.roleCode === "admin")
      ?.permissionKeys,
    ["email-pack:settings:read", "email-pack:settings:write", "email-pack:email:send"]
  );
});

test("EmailConfigService reads SMTP delivery config from email-pack settings", async () => {
  const runtime = createSettingsRuntime();
  await provisionEmailPackSettings(runtime.service);

  await runtime.service.upsertValue({
    requesterPluginId: "email-pack",
    key: "email-pack:email:provider",
    value: "smtp"
  });
  await runtime.service.upsertValue({
    requesterPluginId: "email-pack",
    key: "email-pack:email:from_address",
    value: "cms@example.com"
  });
  await runtime.service.upsertValue({
    requesterPluginId: "email-pack",
    key: "email-pack:email:from_name",
    value: "Example CMS"
  });
  await runtime.service.upsertValue({
    requesterPluginId: "email-pack",
    key: "email-pack:email:smtp_host",
    value: "smtp.example.com"
  });
  await runtime.service.upsertValue({
    requesterPluginId: "email-pack",
    key: "email-pack:email:smtp_port",
    value: 465
  });
  await runtime.service.upsertValue({
    requesterPluginId: "email-pack",
    key: "email-pack:email:smtp_secure",
    value: true
  });
  await runtime.service.upsertValue({
    requesterPluginId: "email-pack",
    key: "email-pack:email:smtp_username",
    value: "smtp-user"
  });
  await runtime.service.upsertSecret({
    requesterPluginId: "email-pack",
    key: "email-pack:email:smtp_password",
    plaintext: "smtp-secret"
  });

  const emailConfig = new EmailConfigService(new RuntimeConfigService(runtime.db), runtime.service);

  assert.deepEqual(await emailConfig.readConfig(), {
    provider: "smtp",
    fromAddress: "cms@example.com",
    fromName: "Example CMS",
    smtp: {
      host: "smtp.example.com",
      port: 465,
      secure: true,
      username: "smtp-user",
      password: "smtp-secret"
    }
  });
});

test("email-pack handler delegates the claim to the durable host and the private job operation preserves the message", async (t) => {
  const db = createFakeDbAdapter();
  const settingsRuntime = createSettingsRuntime(db);
  await provisionEmailPackSettings(settingsRuntime.service);
  const templates = new EmailTemplatesService(new EmailTemplatesRepository(db));
  await templates.seedDefaults();
  const payloads = new SecureEventPayloadsService(
    new SecureEventPayloadsRepository(db),
    new SecureEventPayloadCrypto({ activeKeyId: "test-v1", keys: { "test-v1": randomBytes(32) } }),
    { canClaim: () => ({ allowed: true }) }
  );
  const securePayload = await payloads.forPlugin("core-pack").create({
    eventName: "core-pack:secure-event-payload-ready",
    payloadType: EMAIL_SEND_REQUEST_PAYLOAD_TYPE,
    schemaVersion: EMAIL_SEND_REQUEST_SCHEMA_VERSION,
    requiredPermission: "email-pack:email:send",
    authorizedConsumerPluginIds: ["email-pack"],
    payload: {
      to: "enzo@example.com",
      templateKey: "reset_password",
      variables: {
        recipientName: "Enzo",
        siteName: "Trinacria CMS",
        resetUrl: "https://cms.example/reset/raw-token",
        expiresAt: "27/06/2026 12:00"
      }
    },
    expiresAt: new Date(Date.now() + 60_000)
  });
  const sent: unknown[] = [];
  const app = new TrinacriaApp();
  app.registerGlobalProvider(valueProvider(CORE_TOKENS.SECURE_EVENT_PAYLOAD_HOST, payloads));
  app.registerGlobalProvider(valueProvider(EMAIL_TEMPLATES_SERVICE_TOKEN, templates));
  app.registerGlobalProvider(valueProvider(EMAIL_DELIVERY_OPERATIONS, createEmailDeliveryOperations({
    async send(input: unknown) { sent.push(input); }
  } as never, new CoreOperationAuthorizer({ can: async () => ({ allowed: false }) } as never))));
  app.registerModule(defineModule({ name: "EmailOperationFixture", providers: [EMAIL_OPERATIONS], exports: [EMAIL_OPERATIONS.token] }));
  await app.start(); t.after(() => app.shutdown());
  let services!: PluginHostServices;
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });
  await runtime.register({ manifest: { id: "email-pack", version: "1.0.0", requiresCore: "^0.1.0" }, onLoad(context) { services = context.services; } });
  await runtime.load("email-pack");
  const plugin = createEmailPackPlugin();
  const handler = plugin.eventHandlers?.deliverEmailRequest;
  assert.ok(handler);

  const claims: unknown[] = [];
  await handler(
    {
      securePayloadId: securePayload.id,
      payloadType: EMAIL_SEND_REQUEST_PAYLOAD_TYPE,
      schemaVersion: EMAIL_SEND_REQUEST_SCHEMA_VERSION
    },
    {} as never,
    {
      secureJobs: { async enqueueFromPayload(input) { claims.push(input); return "job-id"; } },
      services,
      pluginId: "email-pack",
      eventName: "core-pack:secure-event-payload-ready",
      handlerName: "deliverEmailRequest"
    }
  );

  assert.deepEqual(claims, [{ payloadId: securePayload.id, eventName: "core-pack:secure-event-payload-ready", payloadType: EMAIL_SEND_REQUEST_PAYLOAD_TYPE, schemaVersion: EMAIL_SEND_REQUEST_SCHEMA_VERSION, requiredPermission: "email-pack:email:send" }]);
  assert.equal(sent.length, 0);
  assert.equal((await payloads.forPlugin("email-pack").claim({ payloadId: securePayload.id, eventName: "core-pack:secure-event-payload-ready", payloadType: EMAIL_SEND_REQUEST_PAYLOAD_TYPE, schemaVersion: EMAIL_SEND_REQUEST_SCHEMA_VERSION, requiredPermission: "email-pack:email:send" })).record.claimCount, 1);
  await services.operations.call("email-pack", "send-job", { payload: { to: "recipient@example.test", subject: "Test subject", text: "Actual message", variables: { nullable: null } }, messageId: `<${"a".repeat(64)}@trinacria.invalid>` });
  assert.equal(sent.length, 1);
  assert.deepEqual((sent[0] as any).to, ["recipient@example.test"]);
  assert.equal((sent[0] as any).text, "Actual message");
  assert.equal((sent[0] as any).messageId, `<${"a".repeat(64)}@trinacria.invalid>`);
});

async function provisionEmailPackSettings(service: SettingsService): Promise<void> {
  for (const definition of EMAIL_PACK_SETTING_DEFINITIONS) {
    await service.upsertDefinition({
      requesterPluginId: "email-pack",
      key: definition.key,
      category: definition.category,
      description: definition.description,
      schema: definition.schema,
      defaultValue: definition.defaultValue,
      visibility: definition.visibility,
      mutable: definition.mutable,
      secret: definition.secret,
      status: definition.status
    });
  }
}

function createSettingsRuntime(db = createFakeDbAdapter()): {
  db: DbAdapter;
  service: SettingsService;
} {
  const definitions = new SettingsDefinitionsRepository(db);
  const values = new SettingsValuesRepository(db);
  const secrets = new SettingsSecretsRepository(db);
  const crypto = new SettingsSecretsCryptoService({
    masterKey: "test-master-key",
    keyVersion: "test-v1"
  });

  return {
    db,
    service: new SettingsService(definitions, values, secrets, crypto)
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
  return matchesMongoFilter(item, filter);
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
