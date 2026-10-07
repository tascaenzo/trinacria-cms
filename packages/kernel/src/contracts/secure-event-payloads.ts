export interface EncryptedSecurePayload {
  cipherText: string;
  iv: string;
  authTag: string;
  algorithm: "aes-256-gcm";
  keyVersion: string;
}

export type SecureEventPayloadStatus = "available" | "consumed" | "expired" | "revoked";

export interface SecureEventPayloadRecord {
  id: string;
  producerPluginId: string;
  eventName: string;
  payloadType: string;
  schemaVersion: number;
  requiredPermission: string;
  status: SecureEventPayloadStatus;
  maxClaims: number;
  claimCount: number;
  expiresAt?: string;
  authorizedConsumerPluginIds?: readonly string[];
  createdAt: string;
  updatedAt: string;
  lastClaimedAt?: string;
  lastClaimedByPluginId?: string;
}

export interface CreateSecureEventPayloadInput<TPayload = unknown> {
  eventName: string;
  payloadType: string;
  schemaVersion: number;
  requiredPermission: string;
  payload: TPayload;
  expiresAt?: string | Date;
  maxClaims?: number;
  authorizedConsumerPluginIds?: readonly string[];
}

export interface ClaimSecureEventPayloadInput {
  payloadId: string;
  eventName: string;
  payloadType: string;
  schemaVersion: number;
  requiredPermission: string;
}

export interface SecureEventPayloadReadyEvent {
  securePayloadId: string;
  payloadType: string;
  schemaVersion: number;
}

export interface ClaimSecureEventPayloadResult<TPayload = unknown> {
  record: SecureEventPayloadRecord;
  payload: TPayload;
}

export type {
  SecureEventPayloadAuthorizationRequest,
  SecureEventPayloadAuthorizer
} from "./plugin-access-policy.js";

export interface SecureEventPayloadClient {
  create<TPayload = unknown>(
    input: CreateSecureEventPayloadInput<TPayload>
  ): Promise<SecureEventPayloadRecord>;
  claim<TPayload = unknown>(
    input: ClaimSecureEventPayloadInput
  ): Promise<ClaimSecureEventPayloadResult<TPayload>>;
  revoke(payloadId: string): Promise<SecureEventPayloadRecord>;
}

/** Key material is host configuration, not a plugin input. Strings are canonical base64. */
export interface SecurePayloadKeyring {
  activeKeyId: string;
  keys: Readonly<Record<string, string | Uint8Array>>;
}
