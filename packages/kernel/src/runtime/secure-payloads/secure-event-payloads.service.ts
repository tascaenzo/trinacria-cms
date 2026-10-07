import type { DbAdapter } from "../../contracts/db-adapter.js";
import type {
  ClaimSecureEventPayloadInput,
  ClaimSecureEventPayloadResult,
  CreateSecureEventPayloadInput,
  SecureEventPayloadAuthorizer,
  SecureEventPayloadClient,
  SecureEventPayloadRecord
} from "../../contracts/secure-event-payloads.js";
import type { SecureEventPayloadCrypto } from "./secure-event-payloads.crypto.js";
import { SecureEventPayloadError } from "./secure-event-payloads.errors.js";
import {
  SecureEventPayloadsRepository,
  type StoredSecureEventPayloadRecord
} from "./secure-event-payloads.repository.js";

export interface SecureEventPayloadHost {
  /** Advanced host composition only. Plugin contexts receive the bound client. */
  forPlugin(pluginId: string): SecureEventPayloadClient;
}
export interface SecureEventPayloadServiceOptions {
  now?: () => Date;
  retentionMs?: number;
}
const DEFAULT_TTL_MS = 15 * 60_000;
const DEFAULT_RETENTION_MS = 24 * 60 * 60_000;
const MAX_CLAIM_ATTEMPTS = 3;

export class SecureEventPayloadsService implements SecureEventPayloadHost {
  private readonly now: () => Date;
  private readonly retentionMs: number;
  constructor(
    private readonly repository: SecureEventPayloadsRepository,
    private readonly crypto: SecureEventPayloadCrypto,
    private readonly authorizer?: SecureEventPayloadAuthorizer | null,
    options: SecureEventPayloadServiceOptions = {}
  ) {
    this.now = options.now ?? (() => new Date());
    this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
    if (!Number.isSafeInteger(this.retentionMs) || this.retentionMs < 1)
      throw new SecureEventPayloadError(
        "secure_event_payload_configuration_invalid",
        "Secure payload retention must be a positive integer in milliseconds"
      );
  }

  /** Host-only session binding, used for atomic vault-to-job transfer. */
  forTransaction(adapter: DbAdapter): SecureEventPayloadsService {
    return new SecureEventPayloadsService(
      new SecureEventPayloadsRepository(adapter),
      this.crypto,
      this.authorizer,
      {
        now: this.now,
        retentionMs: this.retentionMs
      }
    );
  }
  async assertClaimAllowed(consumerId: string, input: ClaimSecureEventPayloadInput): Promise<void> {
    const record = await this.read(input.payloadId);
    if (!record) throw denied("not_found");
    await this.assertStructure(record, consumerId, input, this.clock());
    if (
      !this.authorizer ||
      (
        await this.authorizer.canClaim({
          payload: publicRecord(record),
          consumerPluginId: consumerId,
          eventName: input.eventName,
          requiredPermission: input.requiredPermission
        })
      )?.allowed !== true
    )
      throw denied("policy_denied");
  }
  forPlugin(pluginId: string): SecureEventPayloadClient {
    if (!canonicalPluginId(pluginId)) throw invalidInput();
    return Object.freeze({
      create: <T>(input: CreateSecureEventPayloadInput<T>) =>
        this.clientCall(() => this.create(pluginId, input)),
      claim: <T>(input: ClaimSecureEventPayloadInput) =>
        this.clientCall(() => this.claim<T>(pluginId, { ...input })),
      revoke: (payloadId: string) => this.clientCall(() => this.revoke(pluginId, payloadId))
    });
  }

  private async create<T>(
    producerId: string,
    input: CreateSecureEventPayloadInput<T>
  ): Promise<SecureEventPayloadRecord> {
    rejectIdentityFields(input);
    const now = this.clock();
    const expiresAt = new Date(input.expiresAt ?? now.getTime() + DEFAULT_TTL_MS);
    if (
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt <= now ||
      !canonicalName(input.eventName) ||
      !input.eventName.startsWith(`${producerId}:`) ||
      !canonicalName(input.payloadType) ||
      !canonicalName(input.requiredPermission) ||
      !Number.isSafeInteger(input.schemaVersion) ||
      input.schemaVersion < 1 ||
      input.schemaVersion > 100 ||
      (input.maxClaims !== undefined &&
        (!Number.isSafeInteger(input.maxClaims) || input.maxClaims < 1 || input.maxClaims > 10)) ||
      (input.authorizedConsumerPluginIds !== undefined &&
        (!Array.isArray(input.authorizedConsumerPluginIds) ||
          input.authorizedConsumerPluginIds.some((id) => !canonicalPluginId(id))))
    )
      throw invalidInput();
    let json: string;
    try {
      json = JSON.stringify(input.payload);
      if (!json || Buffer.byteLength(json) > 1024 * 1024) throw new Error();
      JSON.parse(json);
    } catch {
      throw invalidInput();
    }
    const record = await this.repository.create(
      {
        producerPluginId: producerId,
        eventName: input.eventName,
        payloadType: input.payloadType,
        schemaVersion: input.schemaVersion,
        requiredPermission: input.requiredPermission,
        encryptedPayload: this.crypto.encrypt(json),
        maxClaims: input.maxClaims ?? 1,
        expiresAt: expiresAt.toISOString(),
        purgeAt: new Date(expiresAt.getTime() + this.retentionMs),
        ...(input.authorizedConsumerPluginIds !== undefined
          ? { authorizedConsumerPluginIds: [...new Set(input.authorizedConsumerPluginIds)] }
          : {})
      },
      now
    );
    return publicRecord(record);
  }

  private async claim<T>(
    consumerId: string,
    input: ClaimSecureEventPayloadInput
  ): Promise<ClaimSecureEventPayloadResult<T>> {
    rejectIdentityFields(input);
    if (
      !validPayloadId(input.payloadId) ||
      !canonicalName(input.eventName) ||
      !canonicalName(input.payloadType) ||
      !canonicalName(input.requiredPermission) ||
      !Number.isSafeInteger(input.schemaVersion) ||
      input.schemaVersion < 1 ||
      input.schemaVersion > 100
    )
      throw invalidInput();
    for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
      const record = await this.read(input.payloadId);
      if (!record) throw denied("not_found");
      await this.assertStructure(record, consumerId, input, this.clock());
      if (!this.authorizer) throw denied("policy_missing");
      let allowed = false;
      try {
        const decision = await this.authorizer.canClaim(
          Object.freeze({
            payload: publicRecord(record),
            consumerPluginId: consumerId,
            eventName: input.eventName,
            requiredPermission: input.requiredPermission
          })
        );
        allowed = decision?.allowed === true;
      } catch {
        throw denied("policy_error");
      }
      if (!allowed) throw denied("policy_denied");
      const payload = this.plaintext<T>(record);
      // Fresh clock after policy/decryption: TTL deletion is never authorization.
      const now = this.clock();
      await this.assertStructure(record, consumerId, input, now);
      const claimed = await this.repository.claimAvailable(
        record,
        consumerId,
        now,
        this.retentionMs
      );
      if (claimed) return { record: publicRecord(claimed), payload };
    }
    throw new SecureEventPayloadError(
      "secure_event_payload_claim_conflict",
      "Secure payload claim conflicted with another operation"
    );
  }

  private async revoke(producerId: string, payloadId: string): Promise<SecureEventPayloadRecord> {
    if (!validPayloadId(payloadId)) throw invalidInput();
    const record =
      (await this.repository.revokeAvailable(
        payloadId,
        producerId,
        this.clock(),
        this.retentionMs
      )) ?? (await this.read(payloadId));
    if (!record || record.producerPluginId !== producerId) throw denied("producer_not_authorized");
    return publicRecord(record);
  }

  /** Host maintenance. Re-encryption never changes claim count/status or grants. */
  async reencrypt(
    payloadId: string
  ): Promise<{ payloadId: string; keyId: string; changed: boolean }> {
    for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
      const record = await this.read(payloadId);
      if (!record) throw denied("not_found");
      if (record.encryptedPayload.keyVersion === this.crypto.activeKeyId)
        return { payloadId, keyId: this.crypto.activeKeyId, changed: false };
      const plaintext = this.plaintext(record);
      const encryptedPayload = this.crypto.encrypt(JSON.stringify(plaintext));
      if (await this.repository.reencrypt(record, encryptedPayload, this.clock()))
        return { payloadId, keyId: this.crypto.activeKeyId, changed: true };
    }
    throw new SecureEventPayloadError(
      "secure_event_payload_claim_conflict",
      "Secure payload rotation conflicted with another operation"
    );
  }
  async reencryptBatch(keyId: string, limit = 100): Promise<{ scanned: number; changed: number }> {
    if (
      keyId === this.crypto.activeKeyId ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw invalidInput();
    const records = await this.repository.findByKeyId(keyId, limit);
    let changed = 0;
    for (const record of records) if ((await this.reencrypt(record.id)).changed) changed++;
    return { scanned: records.length, changed };
  }

  private async clientCall<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof SecureEventPayloadError) throw error;
      throw new SecureEventPayloadError(
        "secure_event_payload_unavailable",
        "Secure payload storage is unavailable"
      );
    }
  }
  private read(id: string): Promise<StoredSecureEventPayloadRecord | null> {
    return this.repository.findById(id);
  }
  private plaintext<T = unknown>(record: StoredSecureEventPayloadRecord): T {
    const plaintext = this.crypto.decrypt(record.encryptedPayload);
    try {
      return JSON.parse(plaintext) as T;
    } catch {
      throw new SecureEventPayloadError(
        "secure_event_payload_invalid_ciphertext",
        "Secure payload is not valid JSON"
      );
    }
  }
  private async assertStructure(
    record: StoredSecureEventPayloadRecord,
    consumerId: string,
    input: ClaimSecureEventPayloadInput,
    now: Date
  ): Promise<void> {
    if (record.claimCount >= record.maxClaims) throw denied("claim_limit");
    if (record.expiresAt) {
      const expiration = new Date(record.expiresAt);
      if (!Number.isFinite(expiration.getTime()) || expiration.toISOString() !== record.expiresAt)
        throw denied("invalid_record");
      if (expiration <= now) {
        await this.repository.expireAvailable(record.id, now);
        throw denied("expired");
      }
    }
    if (record.status !== "available") throw denied(`status:${record.status}`);
    if (record.eventName !== input.eventName) throw denied("event_mismatch");
    if (record.payloadType !== input.payloadType) throw denied("payload_type_mismatch");
    if (record.schemaVersion !== input.schemaVersion) throw denied("schema_version_mismatch");
    if (record.requiredPermission !== input.requiredPermission) throw denied("permission_mismatch");
    if (
      record.authorizedConsumerPluginIds &&
      !record.authorizedConsumerPluginIds.includes(consumerId)
    )
      throw denied("consumer_not_authorized");
  }
  private clock(): Date {
    const date = this.now();
    if (!(date instanceof Date) || !Number.isFinite(date.getTime()))
      throw new SecureEventPayloadError(
        "secure_event_payload_configuration_invalid",
        "Secure payload clock is invalid"
      );
    return new Date(date.getTime());
  }
}

function publicRecord(record: StoredSecureEventPayloadRecord): SecureEventPayloadRecord {
  const { encryptedPayload, storageRevision, purgeAt, ...metadata } = record;
  return Object.freeze({
    ...metadata,
    ...(metadata.authorizedConsumerPluginIds
      ? { authorizedConsumerPluginIds: Object.freeze([...metadata.authorizedConsumerPluginIds]) }
      : {})
  });
}
function canonicalPluginId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9._/-]*$/.test(value);
}
function canonicalName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 240 &&
    value === value.trim() &&
    /^[a-z0-9][a-z0-9._/-]*:[a-z0-9][a-z0-9:._/-]*$/.test(value)
  );
}
function rejectIdentityFields(input: unknown): void {
  if (
    !input ||
    typeof input !== "object" ||
    "producerPluginId" in input ||
    "consumerPluginId" in input
  )
    throw invalidInput();
}
function invalidInput(): SecureEventPayloadError {
  return new SecureEventPayloadError(
    "secure_event_payload_input_invalid",
    "Secure payload input is invalid"
  );
}
function denied(reason: string): SecureEventPayloadError {
  return new SecureEventPayloadError(
    "secure_event_payload_claim_denied",
    "Secure event payload cannot be claimed",
    { reason }
  );
}

function validPayloadId(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= 300 && value === value.trim()
  );
}
