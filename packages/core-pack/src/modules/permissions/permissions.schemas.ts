import { defineEntity, isValidPermissionKey, s, type Infer } from "@trinacria-cms/kernel";

export const PermissionStatusSchema = s.enum(["active", "disabled"] as const);

export const PermissionRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    key: s
      .string({
        trim: true,
        toLowerCase: true,
        minLength: 3,
        maxLength: 220
      })
      .refine(
        (value) => isValidPermissionKey(value),
        "Permission key must be '<pluginId>:<resource>:<action>'",
        "invalid_permission_key"
      ),
    displayName: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    sourcePluginId: s.string({ trim: true, minLength: 1 }),
    status: PermissionStatusSchema,
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type PermissionRecord = Infer<typeof PermissionRecordSchema>;

/**
 * Canonical permissions entity declaration.
 * It defines schema and logical indexes in one place.
 */
export const PERMISSIONS_ENTITY = defineEntity({
  entityName: "permissions",
  schema: PermissionRecordSchema,
  indexes: [
    {
      fields: { id: 1 },
      unique: true,
      name: "permissions_id_unique"
    },
    {
      fields: { key: 1 },
      unique: true,
      name: "permissions_key_unique"
    },
    {
      fields: { sourcePluginId: 1 },
      name: "permissions_source_plugin_idx"
    },
    {
      fields: { status: 1 },
      name: "permissions_status_idx"
    }
  ] as const
});
