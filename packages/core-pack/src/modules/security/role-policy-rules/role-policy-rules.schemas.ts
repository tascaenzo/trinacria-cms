import { isValidPermissionPattern, s, type Infer } from "@trinacria-cms/kernel";
import {
  EmbeddedRolePolicyRuleSchema,
  RolePolicyRuleConditionSchema,
  RolePolicyRuleEffectSchema
} from "../../roles/roles.schemas.js";

export { RolePolicyRuleEffectSchema, RolePolicyRuleConditionSchema, EmbeddedRolePolicyRuleSchema };

/**
 * API-facing record for policy rules returned by REST endpoints.
 * Derived from the embedded array inside a role document.
 */
export const RolePolicyRuleRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    roleCode: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/
    }),
    effect: RolePolicyRuleEffectSchema,
    permissionPattern: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionPattern(value),
        "Permission pattern must be '<pluginId>:<resource|*>:<action|*>'",
        "invalid_permission_pattern"
      ),
    conditions: s.array(RolePolicyRuleConditionSchema, { unique: true }),
    sourcePluginId: s.string({ trim: true, minLength: 1 }),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type RolePolicyRuleRecord = Infer<typeof RolePolicyRuleRecordSchema>;
