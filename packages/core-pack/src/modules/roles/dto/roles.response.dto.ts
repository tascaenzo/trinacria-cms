import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { RoleRecordSchema } from "../roles.schemas.js";

/**
 * Shared API metadata schema for roles endpoints.
 */
export const RolesResponseMetaSchema = s.object(
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
export const RolesApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 }),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for list roles.
 */
export const ListRolesResponseSchema = s.object(
  {
    data: s.array(RoleRecordSchema),
    meta: RolesResponseMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for role read/create/update.
 */
export const RoleResponseSchema = s.object(
  {
    data: RoleRecordSchema,
    meta: RolesResponseMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for error responses.
 */
export const RolesErrorResponseSchema = s.object(
  {
    error: RolesApiErrorSchema,
    meta: RolesResponseMetaSchema.optional(),
  },
  { strict: true },
);
