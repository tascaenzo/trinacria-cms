import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

export const AuthFlowTokenTypeSchema = s.enum([
  "password_reset",
  "email_verification",
  "user_invite"
] as const);

export const AuthFlowTokenStatusSchema = s.enum([
  "available",
  "consumed",
  "expired",
  "revoked"
] as const);

export const AuthFlowTokenRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    tokenType: AuthFlowTokenTypeSchema,
    tokenHash: s.string({ trim: true, minLength: 32, maxLength: 200 }),
    email: s.string({ trim: true, toLowerCase: true, email: true }),
    userId: s.string({ trim: true, minLength: 1 }).optional(),
    status: AuthFlowTokenStatusSchema,
    expiresAt: s.dateTimeString(),
    consumedAt: s.dateTimeString().optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type AuthFlowTokenType = Infer<typeof AuthFlowTokenTypeSchema>;
export type AuthFlowTokenRecord = Infer<typeof AuthFlowTokenRecordSchema>;

export const AUTH_FLOW_TOKENS_ENTITY = defineEntity({
  entityName: "auth_flow_tokens",
  schema: AuthFlowTokenRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "auth_flow_tokens_id_unique" },
    { fields: { tokenHash: 1 }, unique: true, name: "auth_flow_tokens_hash_unique" },
    { fields: { email: 1, tokenType: 1 }, name: "auth_flow_tokens_email_type_idx" },
    { fields: { expiresAt: 1 }, name: "auth_flow_tokens_expires_at_idx" }
  ] as const
});
