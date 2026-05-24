import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

export const SettingAuditActionSchema = s.enum([
  "definition_upsert",
  "value_upsert",
  "secret_upsert"
] as const);

export type SettingAuditAction = Infer<typeof SettingAuditActionSchema>;

export const SettingsAuditRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    key: s.string({ trim: true, toLowerCase: true, minLength: 5, maxLength: 220 }),
    action: SettingAuditActionSchema,
    actor: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    oldHash: s.string({ trim: true, maxLength: 64 }).optional(),
    newMetadata: s
      .object(
        {
          description: s.string({ maxLength: 500 }).optional(),
          category: s.string({ maxLength: 120 }).optional(),
          hadDefault: s.boolean().optional(),
          hadValue: s.boolean().optional()
        },
        { strict: false }
      )
      .optional(),
    createdAt: s.dateTimeString()
  },
  { strict: true }
);

export type SettingsAuditRecord = Infer<typeof SettingsAuditRecordSchema>;

export const SETTINGS_AUDIT_ENTITY = defineEntity({
  entityName: "settings_audit",
  schema: SettingsAuditRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "settings_audit_id_unique" },
    { fields: { key: 1, createdAt: -1 }, name: "settings_audit_key_ts_idx" },
    { fields: { action: 1, createdAt: -1 }, name: "settings_audit_action_ts_idx" }
  ] as const
});
