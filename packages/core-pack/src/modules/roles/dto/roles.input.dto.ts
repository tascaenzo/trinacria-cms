import { type Infer, isValidPermissionKey, s } from "@trinacria-cms/kernel";
import { RoleStatusSchema } from "../roles.schemas.js";

/**
 * DTO schema for creating a role through public API.
 */
export const CreateRoleInputSchema = s.object(
  {
    code: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/
    }),
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    permissions: s
      .array(
        s
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
        { unique: true }
      )
      .optional()
  },
  { strict: true }
);

export type CreateRoleInput = Infer<typeof CreateRoleInputSchema>;

/**
 * DTO schema for updating editable role metadata and embedded permission grants.
 */
export const UpdateRoleInputSchema = s.object(
  {
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    status: RoleStatusSchema.optional(),
    permissions: s
      .array(
        s
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
        { unique: true }
      )
      .optional()
  },
  { strict: true }
);

export type UpdateRoleInput = Infer<typeof UpdateRoleInputSchema>;

/**
 * DTO schema for updating the status of an existing role.
 */
export const UpdateRoleStatusInputSchema = s.object(
  {
    status: RoleStatusSchema
  },
  { strict: true }
);

export type UpdateRoleStatusInput = Infer<typeof UpdateRoleStatusInputSchema>;

/**
 * DTO schema for list-roles query parameters.
 */
export const ListRolesQuerySchema = s.object(
  {
    limit: s.number({ int: true, min: 1, max: 200 }).optional(),
    offset: s.number({ int: true, min: 0 }).optional()
  },
  { strict: true }
);

export type ListRolesQuery = Infer<typeof ListRolesQuerySchema>;
