import { s } from "@trinacria/schema";
import {
  isValidPermissionKey,
  isValidPermissionPattern,
  isPermissionOwnedByPlugin,
  isPermissionPatternOwnedByPlugin
} from "../plugin-namespace/permission-key.js";
import { isValidNamespaceSegment } from "../plugin-namespace/plugin-namespace.js";

export const securityPermissionSchema = s.object(
  {
    key: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
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

const securityRoleSchema = s.object(
  {
    code: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/
    }),
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional()
  },
  { strict: true }
);

const securityGrantSchema = s.object(
  {
    roleCode: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/
    }),
    permissionKeys: s
      .array(
        s
          .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
          .refine(
            (value) => isValidPermissionKey(value),
            "Permission key must be '<pluginId>:<resource>:<action>'",
            "invalid_permission_key"
          ),
        { unique: true }
      )
      .refine(
        (value) => value.length > 0,
        "Grant permissionKeys cannot be empty",
        "empty_grant_permissions"
      )
  },
  { strict: true }
);

const securityPolicyConditionSchema = s.enum([
  "resource_id_required",
  "resource_id_equals_subject"
] as const);

const securityPolicyRuleSchema = s.object(
  {
    roleCode: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/
    }),
    effect: s.enum(["allow", "deny"] as const),
    permissionPattern: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionPattern(value),
        "Permission pattern must be '<pluginId>:<resource|*>:<action|*>'",
        "invalid_permission_pattern"
      ),
    conditions: s.array(securityPolicyConditionSchema, { unique: true }).optional().default([])
  },
  { strict: true }
);

export const securitySectionSchema = s.object(
  {
    permissions: s
      .array(securityPermissionSchema, {
        unique: (permission) => permission.key
      })
      .optional()
      .default([]),
    roles: s
      .array(securityRoleSchema, {
        unique: (role) => role.code
      })
      .optional()
      .default([]),
    grants: s
      .array(securityGrantSchema, {
        unique: (grant) => grant.roleCode
      })
      .optional()
      .default([]),
    policyRules: s
      .array(securityPolicyRuleSchema, {
        unique: (rule) =>
          `${rule.roleCode}|${rule.effect}|${rule.permissionPattern}|${(rule.conditions ?? []).join(
            ","
          )}`
      })
      .optional()
      .default([])
  },
  { strict: true }
);

export function createSecurityRefines(manifestId: string) {
  return {
    permissionOwnership: (manifest: {
      id: string;
      security?: { permissions?: readonly { key: string }[] };
    }) =>
      (manifest.security?.permissions ?? []).every((permission) =>
        isPermissionOwnedByPlugin(manifest.id, permission.key)
      ),
    grantOwnership: (manifest: {
      id: string;
      security?: { grants?: readonly { permissionKeys: readonly string[] }[] };
    }) =>
      (manifest.security?.grants ?? []).every((grant) =>
        grant.permissionKeys.every((permissionKey) =>
          isPermissionOwnedByPlugin(manifest.id, permissionKey)
        )
      ),
    policyRuleOwnership: (manifest: {
      id: string;
      security?: { policyRules?: readonly { permissionPattern: string }[] };
    }) =>
      (manifest.security?.policyRules ?? []).every((rule) =>
        isPermissionPatternOwnedByPlugin(manifest.id, rule.permissionPattern)
      )
  };
}
