import { s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { RolePolicyRuleRecordSchema } from "../role-policy-rules/role-policy-rules.schemas.js";

/**
 * Shared API metadata schema for role policy rule endpoints.
 */
export const RolePolicyRulesResponseMetaSchema = s.object(
  {
    pluginId: s.literal(CORE_PACK_PLUGIN_ID).optional(),
    count: s.number({ int: true }).optional(),
    limit: s.number({ int: true }).optional(),
    offset: s.number({ int: true }).optional()
  },
  { strict: true }
);

/**
 * Standardized API error payload schema.
 */
export const RolePolicyRulesApiErrorSchema = s.object(
  {
    code: s.string({ trim: true, minLength: 1 }),
    message: s.string({ trim: true, minLength: 1 })
  },
  { strict: true }
);

/**
 * OpenAPI response schema for list role policy rules.
 */
export const ListRolePolicyRulesResponseSchema = s.object(
  {
    data: s.array(RolePolicyRuleRecordSchema),
    meta: RolePolicyRulesResponseMetaSchema.optional()
  },
  { strict: true }
);

/**
 * OpenAPI response schema for create/update role policy rule.
 */
export const RolePolicyRuleResponseSchema = s.object(
  {
    data: RolePolicyRuleRecordSchema,
    meta: RolePolicyRulesResponseMetaSchema.optional()
  },
  { strict: true }
);

/**
 * OpenAPI response schema for role policy rule error responses.
 */
export const RolePolicyRulesErrorResponseSchema = s.object(
  {
    error: RolePolicyRulesApiErrorSchema,
    meta: RolePolicyRulesResponseMetaSchema.optional()
  },
  { strict: true }
);
