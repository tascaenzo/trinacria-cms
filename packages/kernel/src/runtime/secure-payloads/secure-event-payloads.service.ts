import type {
  ClaimSecureEventPayloadInput,
  ClaimSecureEventPayloadResult,
  CreateSecureEventPayloadInput,
  SecureEventPayloadAuthorizer,
  SecureEventPayloadRecord,
  SecureEventPayloadStore
} from "../../contracts/secure-event-payloads.js";
import { CoreError } from "../../errors/core-error.js";
import type { SecureEventPayloadCrypto } from "./secure-event-payloads.crypto.js";
import type { SecureEventPayloadsRepository } from "./secure-event-payloads.repository.js";

const DEFAULT_MAX_CLAIMS = 1;
const DEFAULT_TTL_MS = 15 * 60_000;
const MAX_CLAIMS_LIMIT = 10;

export class SecureEventPayloadError extends CoreError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

export class SecureEventPayloadsService implements SecureEventPayloadStore {
  constructor(
    private readonly repository: SecureEventPayloadsRepository,
    private readonly crypto: SecureEventPayloadCrypto,
    private readonly authorizer?: SecureEventPayloadAuthorizer | null
  ) {}

  async create<TPayload = unknown>(
    input: CreateSecureEventPayloadInput<TPayload>
  ): Promise<SecureEventPayloadRecord> {
    const authorizedConsumerPluginIds = normalizePluginIds(input.authorizedConsumerPluginIds);
    return this.repository.create({
      producerPluginId: normalizePluginId(input.producerPluginId),
      eventName: input.eventName.trim(),
      payloadType: input.payloadType.trim().toLowerCase(),
      schemaVersion: input.schemaVersion,
      requiredPermission: input.requiredPermission.trim().toLowerCase(),
      encryptedPayload: this.crypto.encrypt(JSON.stringify(input.payload)),
      maxClaims: normalizeMaxClaims(input.maxClaims),
      expiresAt: normalizeDate(input.expiresAt ?? new Date(Date.now() + DEFAULT_TTL_MS)),
      ...(authorizedConsumerPluginIds.length > 0 ? { authorizedConsumerPluginIds } : {})
    });
  }

  async claim<TPayload = unknown>(
    input: ClaimSecureEventPayloadInput
  ): Promise<ClaimSecureEventPayloadResult<TPayload>> {
    const record = await this.repository.findById(input.payloadId);
    if (!record) {
      throw new SecureEventPayloadError(
        "secure_event_payload_not_found",
        `Secure event payload "${input.payloadId}" was not found`
      );
    }

    await this.assertClaimAllowed(record, input);
    const claimCount = record.claimCount + 1;
    const nextStatus = claimCount >= record.maxClaims ? "consumed" : "available";
    const claimed = await this.repository.update(record.id, {
      claimCount,
      status: nextStatus,
      lastClaimedAt: new Date().toISOString(),
      lastClaimedByPluginId: normalizePluginId(input.consumerPluginId)
    });
    const active = claimed ?? record;
    return {
      record: active,
      payload: JSON.parse(this.crypto.decrypt(record.encryptedPayload)) as TPayload
    };
  }

  async revoke(payloadId: string): Promise<SecureEventPayloadRecord> {
    const record = await this.repository.findById(payloadId);
    if (!record) {
      throw new SecureEventPayloadError(
        "secure_event_payload_not_found",
        `Secure event payload "${payloadId}" was not found`
      );
    }
    const revoked = await this.repository.update(record.id, { status: "revoked" });
    return revoked ?? record;
  }

  private async assertClaimAllowed(
    record: SecureEventPayloadRecord,
    input: ClaimSecureEventPayloadInput
  ): Promise<void> {
    let decision: "allow" | "deny" = "allow";
    let reason: string | undefined;

    if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) {
      await this.repository.update(record.id, { status: "expired" });
      decision = "deny";
      reason = "expired";
    } else if (record.status !== "available") {
      decision = "deny";
      reason = `status:${record.status}`;
    } else if (record.eventName !== input.eventName.trim()) {
      decision = "deny";
      reason = "event_mismatch";
    } else if (record.payloadType !== input.payloadType.trim().toLowerCase()) {
      decision = "deny";
      reason = "payload_type_mismatch";
    } else if (input.schemaVersion !== undefined && record.schemaVersion !== input.schemaVersion) {
      decision = "deny";
      reason = "schema_version_mismatch";
    } else if (record.requiredPermission !== input.requiredPermission.trim().toLowerCase()) {
      decision = "deny";
      reason = "permission_mismatch";
    } else if (
      record.authorizedConsumerPluginIds?.length &&
      !record.authorizedConsumerPluginIds.includes(normalizePluginId(input.consumerPluginId))
    ) {
      decision = "deny";
      reason = "consumer_not_authorized";
    }

    if (this.authorizer) {
      const authorization = await this.authorizer.canClaim({
        payload: record,
        consumerPluginId: normalizePluginId(input.consumerPluginId),
        eventName: input.eventName.trim(),
        requiredPermission: input.requiredPermission.trim().toLowerCase(),
        decision,
        ...(reason ? { reason } : {})
      });
      decision = authorization.allowed ? "allow" : "deny";
      reason = authorization.reason ?? reason;
    }

    if (decision === "deny") {
      throw new SecureEventPayloadError(
        "secure_event_payload_claim_denied",
        `Secure event payload "${record.id}" cannot be claimed`,
        { reason }
      );
    }
  }
}

function normalizeDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizePluginId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePluginIds(values: readonly string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map(normalizePluginId).filter(Boolean)));
}

function normalizeMaxClaims(value: number | undefined): number {
  const parsed = Number.isFinite(value)
    ? Math.floor(value ?? DEFAULT_MAX_CLAIMS)
    : DEFAULT_MAX_CLAIMS;
  return Math.min(MAX_CLAIMS_LIMIT, Math.max(1, parsed));
}
