import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";

/**
 * Shared API metadata schema for settings endpoints.
 */
export const SettingsResponseMetaSchema = s.object(
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
export const SettingsApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 }),
  },
  { strict: true },
);

/**
 * OpenAPI response schema for error responses.
 */
export const SettingsErrorResponseSchema = s.object(
  {
    error: SettingsApiErrorSchema,
    meta: SettingsResponseMetaSchema.optional(),
  },
  { strict: true },
);
