import { defineEntity, isValidPermissionKey, s, type Infer } from "@trinacria-cms/kernel";

export const RoleStatusSchema = s.enum(["active", "disabled"] as const);

export const RolePermissionKeySchema = s
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
  );

export const RoleRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    code: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/
    }),
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    ownerPluginId: s.string({ trim: true, minLength: 1 }).optional(),
    permissions: s.array(RolePermissionKeySchema).optional(),
    status: RoleStatusSchema,
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type RoleRecord = Infer<typeof RoleRecordSchema>;

/**
 * Canonical roles entity declaration.
 * It defines schema and logical indexes in one place.
 */
export const ROLES_ENTITY = defineEntity({
  entityName: "roles",
  schema: RoleRecordSchema,
  indexes: [
    {
      fields: { id: 1 },
      unique: true,
      name: "roles_id_unique"
    },
    {
      fields: { code: 1 },
      unique: true,
      name: "roles_code_unique"
    },
    {
      fields: { ownerPluginId: 1 },
      name: "roles_owner_plugin_idx"
    },
    {
      fields: { status: 1 },
      name: "roles_status_idx"
    }
  ] as const
});
