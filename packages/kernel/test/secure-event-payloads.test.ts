import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import type { SecureEventPayloadAuthorizer } from "../src/contracts/index.js";
import { SecureEventPayloadCrypto, SecureEventPayloadsRepository, SecureEventPayloadsService, readSecurePayloadKeyring } from "../src/runtime/index.js";
import { vaultDb } from "./_shared/secure-payloads-fixture.js";

const createInput = { eventName: "producer:ready", payloadType: "consumer:message", schemaVersion: 1, requiredPermission: "producer:payload:read", payload: { resetUrl: "https://cms.example/reset/raw-token" }, authorizedConsumerPluginIds: ["consumer"] };
const claimInput = { eventName: "producer:ready", payloadType: "consumer:message", schemaVersion: 1, requiredPermission: "producer:payload:read" };
function fixture(policy: SecureEventPayloadAuthorizer | null = { canClaim: () => ({ allowed: true }) }) {
  const db = vaultDb(); const repository = new SecureEventPayloadsRepository(db.db);
  const keyring = { activeKeyId: "v1", keys: { v1: randomBytes(32), v2: randomBytes(32) } };
  let now = new Date("2026-10-01T10:00:00.000Z");
  const crypto = new SecureEventPayloadCrypto(keyring);
  const host = new SecureEventPayloadsService(repository, crypto, policy, { now: () => now });
  return { ...db, repository, crypto, keyring, host, producer: host.forPlugin("producer"), consumer: host.forPlugin("consumer"), advance(ms: number) { now = new Date(now.getTime() + ms); }, now: () => now };
}
function code(expected: string, reason?: string) {
  return (error: any) => { assert.equal(error.code, expected); if (reason) assert.equal(error.details?.reason, reason); assert.equal(JSON.stringify(error).includes("raw-token"), false); return true; };
}

test("vault encrypts storage, returns sanitized metadata and fixes client identity", async () => {
  const f = fixture(); const record = await f.producer.create(createInput);
  assert.equal(record.producerPluginId, "producer"); assert.ok(Object.isFrozen(record));
  for (const field of ["encryptedPayload", "storageRevision", "purgeAt"]) assert.equal(field in record, false);
  const stored = await f.repository.findById(record.id); assert.ok(stored); assert.doesNotMatch(stored.encryptedPayload.cipherText, /raw-token/);
  await assert.rejects(f.producer.create({ ...createInput, producerPluginId: "foreign" } as any), code("secure_event_payload_input_invalid"));
  await assert.rejects(f.consumer.claim({ ...claimInput, payloadId: record.id, consumerPluginId: "foreign" } as any), code("secure_event_payload_input_invalid"));
  await assert.rejects(f.consumer.revoke(record.id), code("secure_event_payload_claim_denied", "producer_not_authorized"));
  const claimed = await f.consumer.claim<{ resetUrl: string }>({ ...claimInput, payloadId: record.id });
  assert.equal(claimed.payload.resetUrl, createInput.payload.resetUrl); assert.equal(claimed.record.claimCount, 1); assert.equal("encryptedPayload" in claimed.record, false);
  await assert.rejects(f.consumer.claim({ ...claimInput, payloadId: record.id }), code("secure_event_payload_claim_denied"));
});

for (const [name, patch, input, reason] of [
  ["revoked", { status: "revoked" }, {}, "status:revoked"],
  ["expired", { expiresAt: "2026-10-01T09:59:59.000Z" }, {}, "expired"],
  ["limit", { claimCount: 1 }, {}, "claim_limit"],
  ["event", {}, { eventName: "producer:other" }, "event_mismatch"],
  ["type", {}, { payloadType: "consumer:other" }, "payload_type_mismatch"],
  ["schema", {}, { schemaVersion: 2 }, "schema_version_mismatch"],
  ["permission", {}, { requiredPermission: "producer:payload:other" }, "permission_mismatch"],
  ["recipient", { authorizedConsumerPluginIds: ["foreign"] }, {}, "consumer_not_authorized"],
  ["empty allowlist", { authorizedConsumerPluginIds: [] }, {}, "consumer_not_authorized"],
  ["malformed count", { claimCount: -1 }, {}, "invalid_record"]
] as const) test(`permissive policy cannot override structural denial: ${name}`, async () => {
  let evaluations = 0;
  const f = fixture({ canClaim() { evaluations++; return { allowed: true }; } });
  const record = await f.producer.create(createInput); Object.assign(f.records.get(record.id)!, patch);
  await assert.rejects(f.consumer.claim({ ...claimInput, ...input, payloadId: record.id }), code("secure_event_payload_claim_denied", reason));
  assert.equal(evaluations, 0);
});

for (const [name, policy, reason] of [
  ["missing", null, "policy_missing"],
  ["denied", { canClaim: () => ({ allowed: false }) }, "policy_denied"],
  ["invalid", { canClaim: () => ({ allowed: "yes" } as any) }, "policy_denied"],
  ["exception", { canClaim() { throw new Error("secret=raw-token"); } }, "policy_error"]
] as const) test(`vault requires valid policy even without recipient allowlist: ${name}`, async () => {
  const f = fixture(policy); const { authorizedConsumerPluginIds, ...input } = createInput;
  const record = await f.producer.create(input);
  await assert.rejects(f.consumer.claim({ ...claimInput, payloadId: record.id }), code("secure_event_payload_claim_denied", reason));
  assert.equal((await f.repository.findById(record.id))?.claimCount, 0);
});

test("policy sees immutable sanitized metadata, never ciphertext", async () => {
  let observed = false;
  const f = fixture({ canClaim(request) { observed = true; assert.ok(Object.isFrozen(request)); assert.ok(Object.isFrozen(request.payload)); assert.equal("encryptedPayload" in request.payload, false); assert.throws(() => { (request.payload as any).maxClaims = 10; }); return { allowed: true }; } });
  const record = await f.producer.create(createInput); await f.consumer.claim({ ...claimInput, payloadId: record.id }); assert.equal(observed, true);
});

test("lost CAS never returns plaintext and retries policy at most three times", async () => {
  let evaluations = 0; const f = fixture({ canClaim() { evaluations++; return { allowed: true }; } });
  const record = await f.producer.create(createInput); let claims = 0;
  f.repository.claimAvailable = async () => { claims++; return null; };
  await assert.rejects(f.consumer.claim({ ...claimInput, payloadId: record.id }), code("secure_event_payload_claim_conflict"));
  assert.equal(evaluations, 3); assert.equal(claims, 3); assert.equal((await f.repository.findById(record.id))?.claimCount, 0);
});

test("CAS retry reevaluates a newly revoked policy", async () => {
  let evaluations = 0; const f = fixture({ canClaim() { return { allowed: ++evaluations === 1 }; } });
  const record = await f.producer.create(createInput); f.repository.claimAvailable = async () => null;
  await assert.rejects(f.consumer.claim({ ...claimInput, payloadId: record.id }), code("secure_event_payload_claim_denied", "policy_denied"));
  assert.equal(evaluations, 2);
});

test("policy delay cannot bypass expiry and expiration never revives a revoked record", async () => {
  let release!: () => void; let started!: () => void; const ready = new Promise<void>((resolve) => { started = resolve; });
  const f = fixture({ async canClaim() { started(); await new Promise<void>((resolve) => { release = resolve; }); return { allowed: true }; } });
  const record = await f.producer.create({ ...createInput, expiresAt: new Date(f.now().getTime() + 1000) });
  const pending = f.consumer.claim({ ...claimInput, payloadId: record.id }); await ready;
  await f.producer.revoke(record.id); f.advance(1000); release();
  await assert.rejects(pending, code("secure_event_payload_claim_denied", "expired"));
  assert.equal((await f.repository.findById(record.id))?.status, "revoked");
});

for (const kind of ["ciphertext", "json", "unknown key"] as const) test(`invalid ${kind} never consumes a claim`, async () => {
  const f = fixture(); const record = await f.producer.create(createInput); const stored = f.records.get(record.id)!;
  if (kind === "ciphertext") (stored.encryptedPayload as any).authTag = Buffer.alloc(16).toString("base64");
  if (kind === "json") stored.encryptedPayload = f.crypto.encrypt("not-json-raw-token");
  if (kind === "unknown key") (stored.encryptedPayload as any).keyVersion = "missing";
  await assert.rejects(f.consumer.claim({ ...claimInput, payloadId: record.id }), code(kind === "unknown key" ? "secure_event_payload_key_unavailable" : "secure_event_payload_invalid_ciphertext"));
  assert.equal((await f.repository.findById(record.id))?.claimCount, 0);
});

test("keyring reads both versions and rotation CAS preserves state/count/retention", async () => {
  const f = fixture(); const first = await f.producer.create(createInput); await f.consumer.claim({ ...claimInput, payloadId: first.id });
  const v2 = new SecureEventPayloadCrypto({ ...f.keyring, activeKeyId: "v2" });
  const host = new SecureEventPayloadsService(f.repository, v2, { canClaim: () => ({ allowed: true }) }, { now: f.now });
  const second = await host.forPlugin("producer").create(createInput);
  const before = await f.repository.findById(first.id); assert.ok(before);
  assert.equal(v2.decrypt(before.encryptedPayload), JSON.stringify(createInput.payload));
  assert.deepEqual(await host.reencryptBatch("v1"), { scanned: 1, changed: 1 });
  const after = await f.repository.findById(first.id); assert.ok(after);
  assert.equal(after.encryptedPayload.keyVersion, "v2"); assert.equal(after.status, "consumed"); assert.equal(after.claimCount, before.claimCount); assert.deepEqual(after.purgeAt, before.purgeAt);
  assert.deepEqual(await host.reencrypt(first.id), { payloadId: first.id, keyId: "v2", changed: false });
  assert.equal((await host.forPlugin("consumer").claim({ ...claimInput, payloadId: second.id })).record.status, "consumed");
  const reader = new SecureEventPayloadCrypto({ activeKeyId: "v2", keys: { v2: f.keyring.keys.v2 } });
  assert.equal(reader.decrypt(after.encryptedPayload), JSON.stringify(createInput.payload));
});

test("retention starts at terminal transition and repeated revoke does not extend it", async () => {
  const f = fixture(); const record = await f.producer.create(createInput);
  await f.producer.revoke(record.id); const first = await f.repository.findById(record.id);
  assert.equal(first?.purgeAt?.getTime(), f.now().getTime() + 24 * 60 * 60_000);
  f.advance(2000); await f.producer.revoke(record.id); assert.deepEqual((await f.repository.findById(record.id))?.purgeAt, first?.purgeAt);
});

test("keyring rejects absent, malformed and placeholder configuration without exposing material", () => {
  for (const material of ["passphrase-raw-token", Buffer.alloc(32).toString("base64"), Buffer.from("change-me-change-me-change-me-123").toString("base64"), randomBytes(31).toString("base64")]) {
    assert.throws(() => new SecureEventPayloadCrypto({ activeKeyId: "v1", keys: { v1: material } }), code("secure_event_payload_key_unavailable"));
  }
  assert.throws(() => readSecurePayloadKeyring({ NODE_ENV: "production", CMS_SETTINGS_MASTER_KEY: "raw-token" }), code("secure_event_payload_key_unavailable"));
  assert.throws(() => readSecurePayloadKeyring({ CMS_SECURE_PAYLOAD_KEYS_JSON: "raw-token" }), code("secure_event_payload_key_unavailable"));
});

test("starter rejects bad keyring or retention before opening HTTP or accessing DB", async () => {
  const { startCmsApp } = await import("../src/runtime/index.js");
  const { valueProvider } = await import("@trinacria/core");
  const { CORE_TOKENS } = await import("../src/tokens/index.js");
  const db = vaultDb(); let accesses = 0; db.db.repository = () => { accesses++; throw new Error("unexpected DB access"); };
  const options = { coreVersion: "0.1.0", globalProviders: [valueProvider(CORE_TOKENS.DB_ADAPTER, db.db)] };
  await assert.rejects(startCmsApp({ ...options, securePayloads: { keyring: { activeKeyId: "v1", keys: {} } } }), code("secure_event_payload_key_unavailable"));
  await assert.rejects(startCmsApp({ ...options, securePayloads: { keyring: { activeKeyId: "v1", keys: { v1: randomBytes(32) } }, retentionMs: 0 } }), code("secure_event_payload_configuration_invalid"));
  assert.equal(accesses, 0);
});

test("expiry retention deadline does not move on a late denied claim", async () => {
  const f = fixture(); const record = await f.producer.create(createInput); const before = await f.repository.findById(record.id);
  f.advance(16 * 60_000);
  await assert.rejects(f.consumer.claim({ ...claimInput, payloadId: record.id }), code("secure_event_payload_claim_denied", "expired"));
  assert.deepEqual((await f.repository.findById(record.id))?.purgeAt, before?.purgeAt);
});

test("storage errors cannot expose credentials or ciphertext through plugin client", async () => {
  const f = fixture(); f.repository.findById = async () => { throw new Error("mongodb://password=raw-token"); };
  await assert.rejects(f.consumer.claim({ ...claimInput, payloadId: "missing" }), code("secure_event_payload_unavailable"));
});

test("claim and revoke reject filter objects before any storage query", async () => {
  const f = fixture(); let reads = 0;
  f.repository.findById = async () => { reads++; throw new Error("unexpected read"); };
  await assert.rejects(f.consumer.claim({ ...claimInput, payloadId: { $ne: null } } as any), code("secure_event_payload_input_invalid"));
  await assert.rejects(f.producer.revoke({ $ne: null } as any), code("secure_event_payload_input_invalid"));
  await assert.rejects(f.producer.create({ ...createInput, eventName: 123 } as any), code("secure_event_payload_input_invalid"));
  assert.equal(reads, 0);
});


test("starter host resolves policy registered after its first construction and rechecks revocation", async (t) => {
  const { TrinacriaApp, valueProvider, defineModule } = await import("@trinacria/core");
  const { CORE_TOKENS } = await import("../src/tokens/index.js");
  const { registerSecurePayloadHostProvider } = await import("../src/runtime/cms-starter/secure-payload-host.js");
  const app = new TrinacriaApp(); const db = vaultDb();
  app.registerGlobalProvider(valueProvider(CORE_TOKENS.DB_ADAPTER, db.db));
  registerSecurePayloadHostProvider(app, { coreVersion: "0.1.0", securePayloads: { keyring: { activeKeyId: "v1", keys: { v1: randomBytes(32) } } } });
  await app.start(); t.after(() => app.shutdown());
  const host = await app.resolve(CORE_TOKENS.SECURE_EVENT_PAYLOAD_HOST);
  const producer = host.forPlugin("producer"); const consumer = host.forPlugin("consumer");
  const record = await producer.create({ ...createInput, maxClaims: 2 });
  await assert.rejects(consumer.claim({ ...claimInput, payloadId: record.id }), code("secure_event_payload_claim_denied"));
  let allowed = true; let evaluations = 0;
  await app.registerModule(defineModule({ name: "LateCorePolicy", providers: [valueProvider(CORE_TOKENS.SECURE_EVENT_PAYLOAD_AUTHORIZER, { canClaim() { evaluations++; return { allowed }; } })], exports: [CORE_TOKENS.SECURE_EVENT_PAYLOAD_AUTHORIZER] }));
  assert.equal((await consumer.claim({ ...claimInput, payloadId: record.id })).record.claimCount, 1);
  allowed = false;
  await assert.rejects(consumer.claim({ ...claimInput, payloadId: record.id }), code("secure_event_payload_claim_denied", "policy_denied"));
  assert.equal(evaluations, 2); assert.equal((await db.db.repository("kernel", "secure_event_payloads").findOne({ filter: { id: record.id } }))?.claimCount, 1);
});
