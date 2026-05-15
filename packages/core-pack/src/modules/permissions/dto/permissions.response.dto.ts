import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { PermissionRecordSchema } from "../permissions.schemas.js";

/**
 * Shared API metadata schema for permissions endpoints.
 */
export const PermissionsResponseMetaSchema = s.object(
  {
    pluginId: s.literal(CORE_PACK_PLUGIN_ID).optional(),
    count: s.number({ int: true }).optional(),
    limit: s.number({ int: true }).optional(),
    offset: s.number({ int: true }).optional()
  },
  { strict: true }
);

/**
 * Standardized API error payload schema.
 */
export const PermissionsApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 })
  },
  { strict: true }
);

/**
 * OpenAPI response schema for list permissions.
 */
export const ListPermissionsResponseSchema = s.object(
  {
    data: s.array(PermissionRecordSchema),
    meta: PermissionsResponseMetaSchema.optional()
  },
  { strict: true }
);

/**
 * OpenAPI response schema for permission read/create/update.
 */
export const PermissionResponseSchema = s.object(
  {
    data: PermissionRecordSchema,
    meta: PermissionsResponseMetaSchema.optional()
  },
  { strict: true }
);

/**
 * OpenAPI response schema for error responses.
 */
export const PermissionsErrorResponseSchema = s.object(
  {
    error: PermissionsApiErrorSchema,
    meta: PermissionsResponseMetaSchema.optional()
  },
  { strict: true }
);
