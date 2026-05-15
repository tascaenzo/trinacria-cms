import { s, type Infer } from "@trinacria-cms/kernel";

/**
 * DTO schema for assigning a role to an existing user.
 */
export const AssignUserRoleInputSchema = s.object(
  {
    roleCode: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/
    })
  },
  { strict: true }
);

export type AssignUserRoleInput = Infer<typeof AssignUserRoleInputSchema>;
