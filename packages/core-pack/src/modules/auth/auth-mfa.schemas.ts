import { defineEntity, type Infer, s } from "@trinacria-cms/kernel";

export const AuthMfaCredentialRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    userId: s.string({ trim: true, minLength: 1 }),
    secretEncrypted: s.string({ trim: true, minLength: 32 }).optional(),
    recoveryCodeHashes: s.array(s.string({ trim: true, minLength: 32 })).optional(),
    enabledAt: s.dateTimeString().optional(),
    pendingSecretEncrypted: s.string({ trim: true, minLength: 32 }).optional(),
    pendingExpiresAt: s.dateTimeString().optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type AuthMfaCredentialRecord = Infer<typeof AuthMfaCredentialRecordSchema>;

export const AUTH_MFA_CREDENTIALS_ENTITY = defineEntity({
  entityName: "auth_mfa_credentials",
  schema: AuthMfaCredentialRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "auth_mfa_credentials_id_unique" },
    { fields: { userId: 1 }, unique: true, name: "auth_mfa_credentials_user_unique" },
    { fields: { pendingExpiresAt: 1 }, name: "auth_mfa_credentials_pending_expires_at_idx" }
  ] as const
});

export const AuthMfaChallengePurposeSchema = s.enum(["verify", "enroll"] as const);

export const AuthMfaChallengeRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    userId: s.string({ trim: true, minLength: 1 }),
    tokenHash: s.string({ trim: true, minLength: 32, maxLength: 128 }),
    purpose: AuthMfaChallengePurposeSchema,
    expiresAt: s.dateTimeString(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type AuthMfaChallengePurpose = Infer<typeof AuthMfaChallengePurposeSchema>;
export type AuthMfaChallengeRecord = Infer<typeof AuthMfaChallengeRecordSchema>;

export const AUTH_MFA_CHALLENGES_ENTITY = defineEntity({
  entityName: "auth_mfa_challenges",
  schema: AuthMfaChallengeRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "auth_mfa_challenges_id_unique" },
    { fields: { tokenHash: 1 }, unique: true, name: "auth_mfa_challenges_token_hash_unique" },
    { fields: { expiresAt: 1 }, name: "auth_mfa_challenges_expires_at_idx" }
  ] as const
});
