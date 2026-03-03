import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { UserRecordSchema } from "../users.schemas.js";

/**
 * Shared API metadata schema for users endpoints.
 */
export const UsersResponseMetaSchema = s.object(
  {
    pluginId: s.literal(CORE_PACK_PLUGIN_ID).optional(),
    count: s.number({ int: true }).optional(),
    limit: s.number({ int: true }).optional(),
    offset: s.number({ int: true }).optional(),
  },
  { strict: true },
);

/**
 * Standardized API error payload schema.
 */
export const UsersApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 }),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for list users.
 */
export const ListUsersResponseSchema = s.object(
  {
    data: s.array(UserRecordSchema),
    meta: UsersResponseMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for user read/create/update.
 */
export const UserResponseSchema = s.object(
  {
    data: UserRecordSchema,
    meta: UsersResponseMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for error responses.
 */
export const UsersErrorResponseSchema = s.object(
  {
    error: UsersApiErrorSchema,
    meta: UsersResponseMetaSchema.optional(),
  },
  { strict: true },
);
