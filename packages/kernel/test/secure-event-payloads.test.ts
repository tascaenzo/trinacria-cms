import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository, NamespaceContext } from "../src/contracts/index.js";
import {
  SecureEventPayloadCrypto,
  SecureEventPayloadsRepository,
  SecureEventPayloadsService
} from "../src/runtime/index.js";

test("SecureEventPayloadsService encrypts payloads and enforces consumer authorization", async () => {
  const db = createFakeDbAdapter();
  const repository = new SecureEventPayloadsRepository(db);
  const service = new SecureEventPayloadsService(
    repository,
    new SecureEventPayloadCrypto({ masterKey: "secure-payload-test-key" })
  );

  const record = await service.create({
    producerPluginId: "core-pack",
    eventName: "core-pack:secure-event-payload-ready",
    payloadType: "email-pack:send-email-request",
    schemaVersion: 1,
    requiredPermission: "email-pack:email:send",
    payload: { resetUrl: "https://cms.example/reset/raw-token" },
    authorizedConsumerPluginIds: ["email-pack"]
  });

  const persisted = await repository.findById(record.id);
  assert.ok(persisted);
  assert.doesNotMatch(persisted.encryptedPayload.cipherText, /raw-token/);

  await assert.rejects(
    () =>
      service.claim({
        payloadId: record.id,
        consumerPluginId: "third-party-pack",
        eventName: "core-pack:secure-event-payload-ready",
        payloadType: "email-pack:send-email-request",
        schemaVersion: 1,
        requiredPermission: "email-pack:email:send"
      }),
    /cannot be claimed/
  );

  const claimed = await service.claim<{ resetUrl: string }>({
    payloadId: record.id,
    consumerPluginId: "email-pack",
    eventName: "core-pack:secure-event-payload-ready",
    payloadType: "email-pack:send-email-request",
    schemaVersion: 1,
    requiredPermission: "email-pack:email:send"
  });
  assert.equal(claimed.payload.resetUrl, "https://cms.example/reset/raw-token");
});

test("SecureEventPayloadsService allows developer authorizer exceptions for third-party plugins", async () => {
  const db = createFakeDbAdapter();
  const repository = new SecureEventPayloadsRepository(db);
  const service = new SecureEventPayloadsService(
    repository,
    new SecureEventPayloadCrypto({ masterKey: "secure-payload-test-key" }),
    {
      canClaim(request) {
        if (
          request.consumerPluginId === "third-party-pack" &&
          request.payload.producerPluginId === "core-pack" &&
          request.requiredPermission === "email-pack:email:send"
        ) {
          return { allowed: true };
        }
        return { allowed: request.decision === "allow", reason: request.reason };
      }
    }
  );

  const record = await service.create({
    producerPluginId: "core-pack",
    eventName: "core-pack:secure-event-payload-ready",
    payloadType: "email-pack:send-email-request",
    schemaVersion: 1,
    requiredPermission: "email-pack:email:send",
    payload: { resetUrl: "https://cms.example/reset/raw-token" },
    authorizedConsumerPluginIds: ["email-pack"]
  });

  const claimed = await service.claim<{ resetUrl: string }>({
    payloadId: record.id,
    consumerPluginId: "third-party-pack",
    eventName: "core-pack:secure-event-payload-ready",
    payloadType: "email-pack:send-email-request",
    schemaVersion: 1,
    requiredPermission: "email-pack:email:send"
  });

  assert.equal(claimed.payload.resetUrl, "https://cms.example/reset/raw-token");
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

  const repository = <TData extends Record<string, unknown>>(key: string): DbRepository<TData> => ({
    async findOne(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const found = bucket.find((item) => matchesFilter(item, query.filter)) ?? null;
      if (!found) return null;
      return query.parse ? query.parse(found) : found;
    },
    async findMany(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      return bucket
        .filter((item) => matchesFilter(item, query.filter))
        .map((item) => (query.parse ? query.parse(item) : item));
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
      return query.parse ? query.parse(updated) : updated;
    },
    async deleteOne(query: DbQuery<TData>) {
      const bucket = getBucket(key);
      const index = bucket.findIndex((item) => matchesFilter(item, query.filter));
      if (index < 0) return false;
      bucket.splice(index, 1);
      return true;
    }
  });

  return {
    repository(entityName: string, context: NamespaceContext) {
      return repository(`${context.pluginId}:${entityName}`);
    },
    async beginTransaction() {
      return {
        async commit() {},
        async rollback() {}
      };
    },
    async healthCheck() {
      return { ok: true as const };
    }
  };
}

function matchesFilter(item: Record<string, unknown>, filter?: Record<string, unknown>): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([key, value]) => item[key] === value);
}
