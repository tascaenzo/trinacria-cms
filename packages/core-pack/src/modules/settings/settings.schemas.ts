import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";
import { isValidSettingKey } from "./settings-key.js";

const SettingKeySchema = s
  .string({ trim: true, toLowerCase: true, minLength: 5, maxLength: 220 })
  .refine(
    (value) => isValidSettingKey(value),
    "Setting key must be '<pluginId>:<domain>:<name>'",
    "invalid_setting_key",
  );

const PluginIdSchema = s.string({ trim: true, toLowerCase: true, minLength: 1 });

export const SettingDefinitionStatusSchema = s.enum(["active", "disabled"] as const);

/**
 * Persistent settings definition shape.
 * Dynamic fields are stored as serialized JSON strings.
 */
export const SettingDefinitionRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    key: SettingKeySchema,
    ownerPluginId: PluginIdSchema,
    category: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    description: s.string({ trim: true, minLength: 1, maxLength: 500 }).optional(),
    schemaJson: s.string({ minLength: 2, maxLength: 200000 }).optional(),
    defaultValueJson: s.string({ minLength: 2, maxLength: 200000 }).optional(),
    status: SettingDefinitionStatusSchema,
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
  },
  { strict: true },
);

export type SettingDefinitionRecord = Infer<typeof SettingDefinitionRecordSchema>;

export const SettingValueRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    key: SettingKeySchema,
    ownerPluginId: PluginIdSchema,
    valueJson: s.string({ minLength: 2, maxLength: 200000 }),
    version: s.number({ int: true, min: 1 }),
    updatedBy: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
  },
  { strict: true },
);

export type SettingValueRecord = Infer<typeof SettingValueRecordSchema>;

/**
 * Encrypted secrets storage shape.
 */
export const SettingSecretRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    key: SettingKeySchema,
    ownerPluginId: PluginIdSchema,
    cipherText: s.string({ minLength: 8, maxLength: 200000 }),
    iv: s.string({ minLength: 8, maxLength: 256 }),
    authTag: s.string({ minLength: 8, maxLength: 256 }),
    algorithm: s.literal("aes-256-gcm"),
    keyVersion: s.string({ trim: true, minLength: 1, maxLength: 32 }),
    updatedBy: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
  },
  { strict: true },
);

export type SettingSecretRecord = Infer<typeof SettingSecretRecordSchema>;

/**
 * Settings definitions entity declaration.
 */
export const SETTINGS_DEFINITIONS_ENTITY = defineEntity({
  entityName: "settings_definitions",
  schema: SettingDefinitionRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "settings_definitions_id_unique" },
    { fields: { key: 1 }, unique: true, name: "settings_definitions_key_unique" },
    { fields: { ownerPluginId: 1 }, name: "settings_definitions_owner_idx" },
    { fields: { status: 1 }, name: "settings_definitions_status_idx" },
  ] as const,
});

/**
 * Settings values entity declaration.
 */
export const SETTINGS_VALUES_ENTITY = defineEntity({
  entityName: "settings_values",
  schema: SettingValueRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "settings_values_id_unique" },
    { fields: { key: 1 }, unique: true, name: "settings_values_key_unique" },
    { fields: { ownerPluginId: 1 }, name: "settings_values_owner_idx" },
  ] as const,
});

/**
 * Settings encrypted secrets entity declaration.
 */
export const SETTINGS_SECRETS_ENTITY = defineEntity({
  entityName: "settings_secrets",
  schema: SettingSecretRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "settings_secrets_id_unique" },
    { fields: { key: 1 }, unique: true, name: "settings_secrets_key_unique" },
    { fields: { ownerPluginId: 1 }, name: "settings_secrets_owner_idx" },
  ] as const,
});
