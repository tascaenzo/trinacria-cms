import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { UserRoleRecordSchema } from "../user-access/user-roles.schemas.js";

/**
 * Shared API metadata schema for user-access endpoints.
 */
export const UserAccessResponseMetaSchema = s.object(
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
export const UserAccessApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 }),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for role-assignment list endpoints.
 */
export const UserRoleAssignmentsResponseSchema = s.object(
  {
    data: s.array(UserRoleRecordSchema),
    meta: UserAccessResponseMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for single role-assignment create endpoint.
 */
export const UserRoleAssignmentResponseSchema = s.object(
  {
    data: UserRoleRecordSchema,
    meta: UserAccessResponseMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for effective user permissions.
 */
export const UserEffectivePermissionsResponseSchema = s.object(
  {
    data: s.array(
      s.string({ trim: true, minLength: 3, maxLength: 220 }),
      { unique: true },
    ),
    meta: UserAccessResponseMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for error responses.
 */
export const UserAccessErrorResponseSchema = s.object(
  {
    error: UserAccessApiErrorSchema,
    meta: UserAccessResponseMetaSchema.optional(),
  },
  { strict: true },
);
