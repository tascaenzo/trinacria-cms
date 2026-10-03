import type { DbAdapter } from "../../contracts/db-adapter.js";
import type {
  EncryptedSecurePayload,
  SecureEventPayloadRecord
} from "../../contracts/secure-event-payloads.js";
import { SecureEventPayloadError } from "./secure-event-payloads.errors.js";
import {
  SECURE_EVENT_PAYLOADS_ENTITY,
  SecureEventPayloadRecordSchema
} from "./secure-event-payloads.schemas.js";

/** Internal persistence record: ciphertext and TTL metadata never cross the client API. */
export interface StoredSecureEventPayloadRecord extends SecureEventPayloadRecord {
  encryptedPayload: EncryptedSecurePayload;
  storageRevision: number;
  purgeAt?: Date;
}

export class SecureEventPayloadsRepository {
  constructor(private readonly db: DbAdapter) {}

  async initialize(): Promise<void> {
    if (!this.db.ensureIndexes)
      throw new Error("Secure payload storage requires index initialization");
    await this.db.ensureIndexes("kernel", [SECURE_EVENT_PAYLOADS_ENTITY.entityName]);
  }

  async create(
    input: Omit<
      StoredSecureEventPayloadRecord,
      "id" | "createdAt" | "updatedAt" | "claimCount" | "status" | "storageRevision"
    >,
    now: Date
  ): Promise<StoredSecureEventPayloadRecord> {
    return this.parse(
      await this.repository().insertOne({
        ...input,
        status: "available",
        claimCount: 0,
        storageRevision: 1,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      })
    );
  }

  async findById(id: string): Promise<StoredSecureEventPayloadRecord | null> {
    return this.repository().findOne({ filter: { id }, parse: (value) => this.parse(value) });
  }

  async claimAvailable(
    snapshot: StoredSecureEventPayloadRecord,
    consumerId: string,
    now: Date,
    retentionMs: number
  ): Promise<StoredSecureEventPayloadRecord | null> {
    const claimCount = snapshot.claimCount + 1;
    const status = claimCount >= snapshot.maxClaims ? "consumed" : "available";
    return this.update(
      {
        ...snapshotFilter(snapshot),
        status: "available",
        claimCount: snapshot.claimCount,
        maxClaims: snapshot.maxClaims,
        producerPluginId: snapshot.producerPluginId,
        eventName: snapshot.eventName,
        payloadType: snapshot.payloadType,
        schemaVersion: snapshot.schemaVersion,
        requiredPermission: snapshot.requiredPermission,
        authorizedConsumerPluginIds: snapshot.authorizedConsumerPluginIds
          ? [...snapshot.authorizedConsumerPluginIds]
          : { $exists: false },
        expiresAt: snapshot.expiresAt ?? { $exists: false },
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now.toISOString() } }]
      },
      {
        claimCount,
        status,
        storageRevision: snapshot.storageRevision + 1,
        lastClaimedAt: now.toISOString(),
        lastClaimedByPluginId: consumerId,
        ...(status === "consumed" ? { purgeAt: new Date(now.getTime() + retentionMs) } : {})
      },
      now
    );
  }

  async revokeAvailable(
    id: string,
    producerId: string,
    now: Date,
    retentionMs: number
  ): Promise<StoredSecureEventPayloadRecord | null> {
    // Never revive or overwrite a concurrent terminal state; terminal calls are idempotent.
    return this.update(
      { id, producerPluginId: producerId, status: "available" },
      {
        status: "revoked",
        purgeAt: new Date(now.getTime() + retentionMs)
      },
      now
    );
  }

  async expireAvailable(id: string, now: Date): Promise<void> {
    await this.update(
      { id, status: "available", expiresAt: { $lte: now.toISOString() } },
      { status: "expired" },
      now
    );
  }

  async reencrypt(
    snapshot: StoredSecureEventPayloadRecord,
    encryptedPayload: EncryptedSecurePayload,
    now: Date
  ): Promise<StoredSecureEventPayloadRecord | null> {
    return this.update(
      { ...snapshotFilter(snapshot), status: snapshot.status, claimCount: snapshot.claimCount },
      { encryptedPayload, storageRevision: snapshot.storageRevision + 1 },
      now
    );
  }

  async findByKeyId(
    keyId: string,
    limit: number
  ): Promise<readonly StoredSecureEventPayloadRecord[]> {
    return this.repository().findMany({
      filter: { "encryptedPayload.keyVersion": keyId },
      sort: { id: "asc" },
      limit,
      parse: (value) => this.parse(value)
    });
  }

  private async update(
    filter: Record<string, unknown>,
    patch: Partial<StoredSecureEventPayloadRecord>,
    now: Date
  ) {
    const row = await this.repository().updateOne(
      { filter },
      { ...patch, updatedAt: now.toISOString() }
    );
    return row ? this.parse(row) : null;
  }
  private parse(value: unknown): StoredSecureEventPayloadRecord {
    try {
      return SecureEventPayloadRecordSchema.parse(value) as StoredSecureEventPayloadRecord;
    } catch {
      throw new SecureEventPayloadError(
        "secure_event_payload_claim_denied",
        "Secure payload record is invalid",
        { reason: "invalid_record" }
      );
    }
  }
  private repository() {
    return this.db.repository<StoredSecureEventPayloadRecord>(
      SECURE_EVENT_PAYLOADS_ENTITY.entityName,
      { pluginId: "kernel" }
    );
  }
}
function snapshotFilter(record: StoredSecureEventPayloadRecord): Record<string, unknown> {
  return {
    id: record.id,
    storageRevision: record.storageRevision,
    "encryptedPayload.keyVersion": record.encryptedPayload.keyVersion,
    "encryptedPayload.cipherText": record.encryptedPayload.cipherText,
    "encryptedPayload.iv": record.encryptedPayload.iv,
    "encryptedPayload.authTag": record.encryptedPayload.authTag,
    "encryptedPayload.algorithm": record.encryptedPayload.algorithm
  };
}
