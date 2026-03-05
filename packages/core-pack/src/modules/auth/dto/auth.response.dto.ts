import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { UserRecordSchema } from "../../users/users.schemas.js";

/**
 * Shared response metadata schema for auth endpoints.
 */
export const AuthResponseMetaSchema = s.object(
  {
    pluginId: s.literal(CORE_PACK_PLUGIN_ID).optional(),
  },
  { strict: true },
);

/**
 * Standardized API error payload for auth endpoints.
 */
export const AuthApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 }),
  },
  { strict: true },
);

export const AuthSessionSchema = s.object(
  {
    accessToken: s.string({ trim: true, minLength: 16 }),
    tokenType: s.literal("Bearer"),
    expiresAt: s.dateTimeString(),
    user: UserRecordSchema,
  },
  { strict: true },
);

export const AuthSessionResponseSchema = s.object(
  {
    data: AuthSessionSchema,
    meta: AuthResponseMetaSchema.optional(),
  },
  { strict: true },
);

export const AuthMeResponseSchema = s.object(
  {
    data: UserRecordSchema,
    meta: AuthResponseMetaSchema.optional(),
  },
  { strict: true },
);

export const AuthLogoutResponseSchema = s.object(
  {
    data: s.object(
      {
        revoked: s.boolean(),
      },
      { strict: true },
    ),
    meta: AuthResponseMetaSchema.optional(),
  },
  { strict: true },
);

export const AuthErrorResponseSchema = s.object(
  {
    error: AuthApiErrorSchema,
    meta: AuthResponseMetaSchema.optional(),
  },
  { strict: true },
);

