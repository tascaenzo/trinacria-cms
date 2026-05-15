import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";
import { isValidSettingKey } from "./settings-key.js";

const SettingKeySchema = s
  .string({ trim: true, toLowerCase: true, minLength: 5, maxLength: 220 })
  .refine(
    (value) => isValidSettingKey(value),
    "Setting key must be '<pluginId>:<domain>:<name>'",
    "invalid_setting_key"
  );

const PluginIdSchema = s.string({ trim: true, toLowerCase: true, minLength: 1 });

export const SettingDefinitionStatusSchema = s.enum(["active", "disabled"] as const);
export const SettingRecordKindSchema = s.enum(["definition", "value", "secret"] as const);

/**
 * Unified settings record shape stored in a single collection.
 * `kind` discriminates definition/value/secret logical views.
 */
export const SettingRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    kind: SettingRecordKindSchema,
    key: SettingKeySchema,
    ownerPluginId: PluginIdSchema,

    // Definition-specific fields.
    category: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    description: s.string({ trim: true, minLength: 1, maxLength: 500 }).optional(),
    schemaJson: s.string({ minLength: 2, maxLength: 200000 }).optional(),
    defaultValueJson: s.string({ minLength: 2, maxLength: 200000 }).optional(),

    // Value-specific fields.
    valueJson: s.string({ minLength: 2, maxLength: 200000 }).optional(),
    version: s.number({ int: true, min: 1 }).optional(),

    // Secret-specific fields.
    cipherText: s.string({ minLength: 8, maxLength: 200000 }).optional(),
    iv: s.string({ minLength: 8, maxLength: 256 }).optional(),
    authTag: s.string({ minLength: 8, maxLength: 256 }).optional(),
    algorithm: s.literal("aes-256-gcm").optional(),
    keyVersion: s.string({ trim: true, minLength: 1, maxLength: 32 }).optional(),

    // Shared fields.
    status: SettingDefinitionStatusSchema.optional(),
    updatedBy: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type SettingRecord = Infer<typeof SettingRecordSchema>;

/**
 * Logical projection for definition records in unified settings collection.
 */
export const SettingDefinitionRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    kind: s.literal("definition"),
    key: SettingKeySchema,
    ownerPluginId: PluginIdSchema,
    category: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    description: s.string({ trim: true, minLength: 1, maxLength: 500 }).optional(),
    schemaJson: s.string({ minLength: 2, maxLength: 200000 }).optional(),
    defaultValueJson: s.string({ minLength: 2, maxLength: 200000 }).optional(),
    status: SettingDefinitionStatusSchema,
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type SettingDefinitionRecord = Infer<typeof SettingDefinitionRecordSchema>;

/**
 * Logical projection for explicit value records in unified settings collection.
 */
export const SettingValueRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    kind: s.literal("value"),
    key: SettingKeySchema,
    ownerPluginId: PluginIdSchema,
    valueJson: s.string({ minLength: 2, maxLength: 200000 }),
    version: s.number({ int: true, min: 1 }),
    updatedBy: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type SettingValueRecord = Infer<typeof SettingValueRecordSchema>;

/**
 * Logical projection for encrypted secret records in unified settings collection.
 */
export const SettingSecretRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    kind: s.literal("secret"),
    key: SettingKeySchema,
    ownerPluginId: PluginIdSchema,
    cipherText: s.string({ minLength: 8, maxLength: 200000 }),
    iv: s.string({ minLength: 8, maxLength: 256 }),
    authTag: s.string({ minLength: 8, maxLength: 256 }),
    algorithm: s.literal("aes-256-gcm"),
    keyVersion: s.string({ trim: true, minLength: 1, maxLength: 32 }),
    updatedBy: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type SettingSecretRecord = Infer<typeof SettingSecretRecordSchema>;

/**
 * Unified settings entity declaration.
 * All settings records are stored in this single collection.
 */
export const SETTINGS_ENTITY = defineEntity({
  entityName: "settings",
  schema: SettingRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "settings_id_unique" },
    {
      fields: { kind: 1, key: 1 },
      unique: true,
      name: "settings_kind_key_unique"
    },
    { fields: { ownerPluginId: 1, kind: 1 }, name: "settings_owner_kind_idx" },
    { fields: { key: 1 }, name: "settings_key_idx" }
  ] as const
});
