import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { UserRecordSchema } from "../../users/users.schemas.js";

/**
 * Shared API metadata schema for installation endpoints.
 */
export const InstallationResponseMetaSchema = s.object(
  {
    pluginId: s.literal(CORE_PACK_PLUGIN_ID).optional()
  },
  { strict: true }
);

/**
 * Standardized API error payload schema.
 */
export const InstallationApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 })
  },
  { strict: true }
);

/**
 * Public installation status model returned by `GET /v1/install/status`.
 */
export const InstallationStatusSchema = s.object(
  {
    installed: s.boolean(),
    installedAt: s.dateTimeString().optional(),
    adminUserId: s.string({ trim: true, minLength: 1 }).optional(),
    envFilePresent: s.boolean(),
    dbConfigured: s.boolean(),
    envFilePath: s.string({ trim: true, minLength: 1 })
  },
  { strict: true }
);

/**
 * OpenAPI response schema for installation status endpoint.
 */
export const InstallationStatusResponseSchema = s.object(
  {
    data: InstallationStatusSchema,
    meta: InstallationResponseMetaSchema.optional()
  },
  { strict: true }
);

/**
 * OpenAPI response schema for successful bootstrap endpoint.
 */
export const InstallationBootstrapResponseSchema = s.object(
  {
    data: s.object(
      {
        status: InstallationStatusSchema,
        adminUser: UserRecordSchema
      },
      { strict: true }
    ),
    meta: InstallationResponseMetaSchema.optional()
  },
  { strict: true }
);

export const InstallationErrorResponseSchema = s.object(
  {
    error: InstallationApiErrorSchema,
    meta: InstallationResponseMetaSchema.optional()
  },
  { strict: true }
);
