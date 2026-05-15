import { isValidPermissionPattern, s, type Infer } from "@trinacria-cms/kernel";
import {
  RolePolicyRuleConditionSchema,
  RolePolicyRuleEffectSchema
} from "../role-policy-rules/role-policy-rules.schemas.js";

/**
 * DTO schema for creating a role policy rule.
 */
export const CreateRolePolicyRuleInputSchema = s.object(
  {
    effect: RolePolicyRuleEffectSchema,
    permissionPattern: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionPattern(value),
        "Permission pattern must be '<pluginId>:<resource|*>:<action|*>'",
        "invalid_permission_pattern"
      ),
    conditions: s.array(RolePolicyRuleConditionSchema, { unique: true }).optional().default([])
  },
  { strict: true }
);

export type CreateRolePolicyRuleInput = Infer<typeof CreateRolePolicyRuleInputSchema>;

/**
 * DTO schema for updating a role policy rule.
 */
export const UpdateRolePolicyRuleInputSchema = CreateRolePolicyRuleInputSchema;

export type UpdateRolePolicyRuleInput = Infer<typeof UpdateRolePolicyRuleInputSchema>;
