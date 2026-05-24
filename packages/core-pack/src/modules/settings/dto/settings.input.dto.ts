import { s, type Infer } from "@trinacria-cms/kernel";
import { isValidSettingKey } from "../_shared/settings-key.js";

const SettingKeySchema = s
  .string({ trim: true, toLowerCase: true, minLength: 5, maxLength: 220 })
  .refine(
    (value) => isValidSettingKey(value),
    "Setting key must be '<pluginId>:<domain>:<name>'",
    "invalid_setting_key"
  );

/**
 * DTO schema for upserting setting definitions.
 * Dynamic JSON fields are accepted as raw unknown and validated in service layer.
 */
export const UpsertSettingDefinitionInputSchema = s.object(
  {
    key: SettingKeySchema,
    category: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    description: s.string({ trim: true, minLength: 1, maxLength: 500 }).optional()
  },
  // Keep non-strict to allow free-form payload fields (e.g. defaultValue, schema)
  // validated later in service layer as JSON-compatible values.
  { strict: false }
);

export type UpsertSettingDefinitionInput = Infer<typeof UpsertSettingDefinitionInputSchema>;

/**
 * DTO schema for upserting non-sensitive setting values.
 */
export const UpsertSettingValueInputSchema = s.object(
  {
    updatedBy: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional()
  },
  // Keep non-strict to allow free-form `value` field validated in service layer.
  { strict: false }
);

export type UpsertSettingValueInput = Infer<typeof UpsertSettingValueInputSchema>;

/**
 * DTO schema for upserting encrypted setting secrets.
 */
export const UpsertSettingSecretInputSchema = s.object(
  {
    plaintext: s.string({ minLength: 1, maxLength: 100000 }),
    updatedBy: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional()
  },
  { strict: true }
);

export type UpsertSettingSecretInput = Infer<typeof UpsertSettingSecretInputSchema>;

/**
 * DTO schema for listing settings definitions.
 */
export const ListSettingDefinitionsQuerySchema = s.object(
  {
    ownerPluginId: s.string({ trim: true, toLowerCase: true, minLength: 1 }).optional(),
    limit: s.number({ int: true, min: 1, max: 200 }).optional(),
    offset: s.number({ int: true, min: 0 }).optional()
  },
  { strict: true }
);

export type ListSettingDefinitionsQuery = Infer<typeof ListSettingDefinitionsQuerySchema>;

/**
 * DTO schema for reading setting key from route params.
 */
export const SettingKeyParamSchema = s.object(
  {
    key: SettingKeySchema
  },
  { strict: true }
);

export type SettingKeyParam = Infer<typeof SettingKeyParamSchema>;

/**
 * DTO schema for exporting plugin settings snapshot.
 */
export const ExportPluginSettingsParamSchema = s.object(
  {
    pluginId: s.string({ trim: true, toLowerCase: true, minLength: 1 })
  },
  { strict: true }
);

export type ExportPluginSettingsParam = Infer<typeof ExportPluginSettingsParamSchema>;

/**
 * Shared OpenAPI schema for free-form JSON values accepted by settings endpoints.
 */
export const JsonValueOpenApiSchema: Record<string, unknown> = {
  oneOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "null" },
    {
      type: "array",
      items: {}
    },
    {
      type: "object",
      additionalProperties: true
    }
  ]
};

/**
 * Explicit OpenAPI schema for settings definition upsert request.
 * The runtime validator remains the schema above, while this object gives
 * the SDK generator a precise body contract.
 */
export const UpsertSettingDefinitionBodyOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["key"],
  properties: {
    key: { type: "string" },
    category: { type: "string" },
    description: { type: "string" },
    schema: JsonValueOpenApiSchema,
    defaultValue: JsonValueOpenApiSchema
  }
};

/**
 * Explicit OpenAPI schema for setting value upsert request.
 */
export const UpsertSettingValueBodyOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["value"],
  properties: {
    value: JsonValueOpenApiSchema,
    updatedBy: { type: "string" }
  }
};

/**
 * Explicit OpenAPI schema for encrypted secret upsert request.
 */
export const UpsertSettingSecretBodyOpenApiSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["plaintext"],
  properties: {
    plaintext: { type: "string" },
    updatedBy: { type: "string" }
  }
};
