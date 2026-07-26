import { type Infer, isValidPermissionKey, s } from "@trinacria-cms/kernel";
import { PermissionStatusSchema } from "../permissions.schemas.js";

/**
 * DTO schema for creating a permission through public API.
 */
export const CreatePermissionInputSchema = s.object(
  {
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
    description: s.string({ trim: true, maxLength: 500 }).optional()
  },
  { strict: true }
);

export type CreatePermissionInput = Infer<typeof CreatePermissionInputSchema>;

/**
 * DTO schema for updating editable permission metadata.
 */
export const UpdatePermissionInputSchema = s.object(
  {
    displayName: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    status: PermissionStatusSchema.optional()
  },
  { strict: true }
);

export type UpdatePermissionInput = Infer<typeof UpdatePermissionInputSchema>;

/**
 * DTO schema for updating the status of an existing permission.
 */
export const UpdatePermissionStatusInputSchema = s.object(
  {
    status: PermissionStatusSchema
  },
  { strict: true }
);

export type UpdatePermissionStatusInput = Infer<typeof UpdatePermissionStatusInputSchema>;

/**
 * DTO schema for list-permissions query parameters.
 */
export const ListPermissionsQuerySchema = s.object(
  {
    limit: s.number({ int: true, min: 1, max: 200 }).optional(),
    offset: s.number({ int: true, min: 0 }).optional()
  },
  { strict: true }
);

export type ListPermissionsQuery = Infer<typeof ListPermissionsQuerySchema>;
