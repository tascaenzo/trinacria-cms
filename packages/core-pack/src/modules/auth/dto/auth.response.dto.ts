import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { UserRecordSchema } from "../../users/users.schemas.js";

/**
 * Shared response metadata schema for auth endpoints.
 */
export const AuthResponseMetaSchema = s.object(
  {
    pluginId: s.literal(CORE_PACK_PLUGIN_ID).optional()
  },
  { strict: true }
);

/**
 * Standardized API error payload for auth endpoints.
 */
export const AuthApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 })
  },
  { strict: true }
);

export const AuthSessionSchema = s.object(
  {
    accessToken: s.string({ trim: true, minLength: 16 }),
    tokenType: s.literal("Bearer"),
    expiresAt: s.dateTimeString(),
    refreshExpiresAt: s.dateTimeString(),
    user: UserRecordSchema
  },
  { strict: true }
);

export const AuthSessionResponseSchema = s.object(
  {
    data: AuthSessionSchema,
    meta: AuthResponseMetaSchema.optional()
  },
  { strict: true }
);

export const AuthMfaChallengeSchema = s.object(
  {
    status: s.enum(["mfa_required", "mfa_enrollment_required"] as const),
    challengeId: s.string({ trim: true, minLength: 32 }),
    expiresAt: s.dateTimeString()
  },
  { strict: true }
);

export const AuthPasswordLoginResponseSchema = s.object(
  {
    data: s.union([AuthSessionSchema, AuthMfaChallengeSchema]),
    meta: AuthResponseMetaSchema.optional()
  },
  { strict: true }
);

export const AuthMfaStatusSchema = s.object(
  {
    mode: s.enum(["disabled", "optional", "required"] as const),
    enabled: s.boolean(),
    enabledAt: s.dateTimeString().optional(),
    recoveryCodesRemaining: s.number({ min: 0 })
  },
  { strict: true }
);

export const AuthMfaStatusResponseSchema = s.object(
  {
    data: AuthMfaStatusSchema,
    meta: AuthResponseMetaSchema.optional()
  },
  { strict: true }
);

export const AuthMfaEnrollmentSetupSchema = s.object(
  {
    manualKey: s.string({ trim: true, minLength: 16 }),
    otpauthUrl: s.string({ trim: true, minLength: 20 }),
    expiresAt: s.dateTimeString()
  },
  { strict: true }
);

export const AuthMfaEnrollmentSetupResponseSchema = s.object(
  {
    data: AuthMfaEnrollmentSetupSchema,
    meta: AuthResponseMetaSchema.optional()
  },
  { strict: true }
);

export const AuthMfaEnrollmentConfirmationSchema = s.object(
  {
    recoveryCodes: s.array(s.string({ trim: true, minLength: 8 }))
  },
  { strict: true }
);

export const AuthMfaEnrollmentConfirmationResponseSchema = s.object(
  {
    data: AuthMfaEnrollmentConfirmationSchema,
    meta: AuthResponseMetaSchema.optional()
  },
  { strict: true }
);

export const AuthMfaLoginSessionSchema = s.object(
  {
    accessToken: s.string({ trim: true, minLength: 16 }),
    tokenType: s.literal("Bearer"),
    expiresAt: s.dateTimeString(),
    refreshExpiresAt: s.dateTimeString(),
    user: UserRecordSchema,
    recoveryCodes: s.array(s.string({ trim: true, minLength: 8 })).optional()
  },
  { strict: true }
);

export const AuthMfaLoginSessionResponseSchema = s.object(
  {
    data: AuthMfaLoginSessionSchema,
    meta: AuthResponseMetaSchema.optional()
  },
  { strict: true }
);

export const AuthMeResponseSchema = s.object(
  {
    data: UserRecordSchema,
    meta: AuthResponseMetaSchema.optional()
  },
  { strict: true }
);

export const AuthLogoutResponseSchema = s.object(
  {
    data: s.object(
      {
        revoked: s.boolean()
      },
      { strict: true }
    ),
    meta: AuthResponseMetaSchema.optional()
  },
  { strict: true }
);

export const AuthErrorResponseSchema = s.object(
  {
    error: AuthApiErrorSchema,
    meta: AuthResponseMetaSchema.optional()
  },
  { strict: true }
);
