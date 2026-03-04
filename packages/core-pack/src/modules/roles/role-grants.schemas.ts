import {
  isValidPermissionKey,
  s,
  type Infer,
} from "@trinacria-cms/kernel";

/**
 * Embedded grant payload stored inside a role document.
 * It keeps contribution ownership for safe plugin deprovisioning.
 */
export const EmbeddedRoleGrantSchema = s.object(
  {
    permissionKey: s
      .string({
        trim: true,
        toLowerCase: true,
        minLength: 3,
        maxLength: 220,
      })
      .refine(
        (value) => isValidPermissionKey(value),
        "Permission key must be '<pluginId>:<resource>:<action>'",
        "invalid_permission_key",
      ),
    sourcePluginId: s.string({ trim: true, minLength: 1 }),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
  },
  { strict: true },
);

export type EmbeddedRoleGrant = Infer<typeof EmbeddedRoleGrantSchema>;

/**
 * API-facing record linking one role to one permission.
 * It is derived from embedded grants and keeps backward-compatible shape.
 */
export const RoleGrantRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    roleCode: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/,
    }),
    permissionKey: s
      .string({
        trim: true,
        toLowerCase: true,
        minLength: 3,
        maxLength: 220,
      })
      .refine(
        (value) => isValidPermissionKey(value),
        "Permission key must be '<pluginId>:<resource>:<action>'",
        "invalid_permission_key",
      ),
    sourcePluginId: s.string({ trim: true, minLength: 1 }),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
  },
  { strict: true },
);

export type RoleGrantRecord = Infer<typeof RoleGrantRecordSchema>;
