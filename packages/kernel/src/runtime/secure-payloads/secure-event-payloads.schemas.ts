import { s, type Infer } from "@trinacria/schema";
import { defineEntity } from "../persistence/entity-registry.js";

export const EncryptedSecurePayloadSchema = s.object(
  {
    cipherText: s.string({ minLength: 1 }),
    iv: s.string({ minLength: 1 }),
    authTag: s.string({ minLength: 1 }),
    algorithm: s.enum(["aes-256-gcm"] as const),
    keyVersion: s.string({ trim: true, minLength: 1 })
  },
  { strict: true }
);

export const SecureEventPayloadStatusSchema = s.enum([
  "available",
  "consumed",
  "expired",
  "revoked"
] as const);

export const SecureEventPayloadRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    producerPluginId: s.string({ trim: true, toLowerCase: true, minLength: 1, maxLength: 120 }),
    eventName: s.string({ trim: true, minLength: 3, maxLength: 240 }),
    payloadType: s.string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 180 }),
    schemaVersion: s.number({ int: true, min: 1, max: 100 }),
    requiredPermission: s.string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 }),
    encryptedPayload: EncryptedSecurePayloadSchema,
    status: SecureEventPayloadStatusSchema,
    maxClaims: s.number({ int: true, min: 1, max: 100 }),
    claimCount: s.number({ int: true, min: 0 }),
    expiresAt: s.dateTimeString().optional(),
    authorizedConsumerPluginIds: s
      .array(s.string({ trim: true, toLowerCase: true, minLength: 1, maxLength: 120 }), {
        unique: true
      })
      .optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
    lastClaimedAt: s.dateTimeString().optional(),
    lastClaimedByPluginId: s.string({ trim: true, toLowerCase: true, minLength: 1 }).optional()
  },
  { strict: true }
);

export type SecureEventPayloadRecordShape = Infer<typeof SecureEventPayloadRecordSchema>;

export const SECURE_EVENT_PAYLOADS_ENTITY = defineEntity({
  entityName: "secure_event_payloads",
  schema: SecureEventPayloadRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "secure_event_payloads_id_unique" },
    { fields: { producerPluginId: 1, eventName: 1 }, name: "secure_event_payloads_event_idx" },
    { fields: { payloadType: 1, schemaVersion: 1 }, name: "secure_event_payloads_type_idx" },
    { fields: { status: 1, createdAt: 1 }, name: "secure_event_payloads_status_created_idx" },
    { fields: { expiresAt: 1 }, name: "secure_event_payloads_expires_at_idx" }
  ] as const
});
