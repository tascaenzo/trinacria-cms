import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../../plugin/core-pack.constants.js";
import { ApiKeyPublicRecordSchema } from "../api-keys.schemas.js";

/**
 * Shared API metadata schema for API key endpoints.
 */
export const ApiKeysResponseMetaSchema = s.object(
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
export const ApiKeysApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 }),
  },
  { strict: true },
);

/**
 * Response schema exposing one API key metadata record.
 */
export const ApiKeyResponseSchema = s.object(
  {
    data: ApiKeyPublicRecordSchema,
    meta: ApiKeysResponseMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * Response schema exposing a one-time plaintext key on issue/rotation.
 */
export const ApiKeySecretResponseSchema = s.object(
  {
    data: s.object(
      {
        record: ApiKeyPublicRecordSchema,
        apiKey: s.string({ trim: true, minLength: 1 }),
      },
      { strict: true },
    ),
    meta: ApiKeysResponseMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * Response schema for API key lists.
 */
export const ListApiKeysResponseSchema = s.object(
  {
    data: s.array(ApiKeyPublicRecordSchema),
    meta: ApiKeysResponseMetaSchema.optional(),
  },
  { strict: true },
);

/**
 * Response schema for API key errors.
 */
export const ApiKeysErrorResponseSchema = s.object(
  {
    error: ApiKeysApiErrorSchema,
    meta: ApiKeysResponseMetaSchema.optional(),
  },
  { strict: true },
);
