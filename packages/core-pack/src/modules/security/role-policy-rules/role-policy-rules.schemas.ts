import { defineEntity, isValidPermissionPattern, s, type Infer } from "@trinacria-cms/kernel";

export const RolePolicyRuleEffectSchema = s.enum(["allow", "deny"] as const);

export const RolePolicyRuleConditionSchema = s.enum([
  "resource_id_required",
  "resource_id_equals_subject"
] as const);

/**
 * Record containing wildcard/conditional allow/deny rules for a role.
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

/**
 * Canonical role policy rules entity declaration.
 */
export const ROLE_POLICY_RULES_ENTITY = defineEntity({
  entityName: "role_policy_rules",
  schema: RolePolicyRuleRecordSchema,
  indexes: [
    {
      fields: { id: 1 },
      unique: true,
      name: "role_policy_rules_id_unique"
    },
    {
      fields: {
        roleCode: 1,
        effect: 1,
        permissionPattern: 1,
        sourcePluginId: 1
      },
      unique: true,
      name: "role_policy_rules_unique_rule"
    },
    {
      fields: { roleCode: 1 },
      name: "role_policy_rules_role_code_idx"
    },
    {
      fields: { sourcePluginId: 1 },
      name: "role_policy_rules_source_plugin_idx"
    }
  ] as const
});
