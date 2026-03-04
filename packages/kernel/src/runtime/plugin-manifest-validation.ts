import type {
  PluginManifest,
} from "../contracts/plugin-manifest.js";
import {
  ValidationError,
  formatValidationError,
  s,
  type Infer,
} from "@trinacria/schema";
import {
  PluginCompatibilityError,
  PluginManifestError,
} from "../errors/plugin-errors.js";
import {
  isValidVersion,
  isValidVersionRange,
  satisfiesVersion,
} from "./semver.js";
import {
  isPermissionOwnedByPlugin,
  isPermissionPatternOwnedByPlugin,
  isValidPermissionKey,
  isValidPermissionPattern,
} from "./permission-key.js";

const PLUGIN_ID_REGEX = /^[a-z0-9][a-z0-9-._/]*$/;

const pluginDependencySchema = s.object(
  {
    pluginId: s
      .string({ trim: true, minLength: 1, pattern: PLUGIN_ID_REGEX })
      .refine(
        (value) => !value.includes("//"),
        "Dependency pluginId cannot contain empty path segments",
        "invalid_plugin_id_segment",
      ),
    versionRange: s
      .string({ trim: true, minLength: 1 })
      .refine(
        (value) => isValidVersionRange(value),
        "Dependency versionRange is not a supported semver range",
        "invalid_version_range",
      ),
    optional: s.boolean().optional().default(false),
  },
  { strict: true },
);

const securityPermissionSchema = s.object(
  {
    key: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "Permission key must be '<pluginId>:<resource>:<action>'",
        "invalid_permission_key",
      ),
    displayName: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
  },
  { strict: true },
);

const securityRoleSchema = s.object(
  {
    code: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/,
    }),
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
  },
  { strict: true },
);

const securityGrantSchema = s.object(
  {
    roleCode: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/,
    }),
    permissionKeys: s
      .array(
        s
          .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
          .refine(
            (value) => isValidPermissionKey(value),
            "Permission key must be '<pluginId>:<resource>:<action>'",
            "invalid_permission_key",
          ),
        { unique: true },
      )
      .refine(
        (value) => value.length > 0,
        "Grant permissionKeys cannot be empty",
        "empty_grant_permissions",
      ),
  },
  { strict: true },
);

const securityPolicyConditionSchema = s.enum(
  ["resource_id_required", "resource_id_equals_subject"] as const,
);

const securityPolicyRuleSchema = s.object(
  {
    roleCode: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/,
    }),
    effect: s.enum(["allow", "deny"] as const),
    permissionPattern: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionPattern(value),
        "Permission pattern must be '<pluginId>:<resource|*>:<action|*>'",
        "invalid_permission_pattern",
      ),
    conditions: s
      .array(securityPolicyConditionSchema, { unique: true })
      .optional()
      .default([]),
  },
  { strict: true },
);

const pluginManifestSchema = s
  .object(
    {
      id: s
        .string({ trim: true, minLength: 1, pattern: PLUGIN_ID_REGEX })
        .refine(
          (value) => !value.includes("//"),
          "Plugin id cannot contain empty path segments",
          "invalid_plugin_id_segment",
        ),
      version: s
        .string({ trim: true, minLength: 1 })
        .refine(
          (value) => isValidVersion(value),
          "Plugin version must be a valid semver",
          "invalid_semver_version",
        ),
      requiresCore: s
        .string({ trim: true, minLength: 1 })
        .refine(
          (value) => isValidVersionRange(value),
          "requiresCore must be a supported semver range",
          "invalid_core_range",
        ),
      capabilities: s
        .array(
          s.string({ trim: true, minLength: 1, pattern: /^[a-z0-9][a-z0-9._-]*$/ }),
          { unique: true },
        )
        .optional()
        .default([]),
      dependencies: s
        .array(pluginDependencySchema, {
          unique: (dependency) => dependency.pluginId,
        })
        .optional()
        .default([]),
      security: s
        .object(
          {
            permissions: s
              .array(securityPermissionSchema, {
                unique: (permission) => permission.key,
              })
              .optional()
              .default([]),
            roles: s
              .array(securityRoleSchema, {
                unique: (role) => role.code,
              })
              .optional()
              .default([]),
            grants: s
              .array(securityGrantSchema, {
                unique: (grant) => grant.roleCode,
              })
              .optional()
              .default([]),
            policyRules: s
              .array(securityPolicyRuleSchema, {
                unique: (rule) =>
                  `${rule.roleCode}|${rule.effect}|${rule.permissionPattern}|${(
                    rule.conditions ?? []
                  ).join(",")}`,
              })
              .optional()
              .default([]),
          },
          { strict: true },
        )
        .optional(),
    },
    { strict: true },
  )
  .refine(
    (manifest) =>
      (manifest.dependencies ?? []).every(
        (dependency) => dependency.pluginId !== manifest.id,
      ),
    "Plugin cannot depend on itself",
    "self_dependency",
  )
  .refine(
    (manifest) =>
      (manifest.security?.permissions ?? []).every((permission) =>
        isPermissionOwnedByPlugin(manifest.id, permission.key),
      ),
    "Each security permission key must belong to the manifest plugin id",
    "security_permission_ownership_violation",
  )
  .refine(
    (manifest) =>
      (manifest.security?.grants ?? []).every((grant) =>
        grant.permissionKeys.every((permissionKey) =>
          isPermissionOwnedByPlugin(manifest.id, permissionKey),
        ),
      ),
    "Each security grant permission key must belong to the manifest plugin id",
    "security_grant_ownership_violation",
  )
  .refine(
    (manifest) =>
      (manifest.security?.policyRules ?? []).every((rule) =>
        isPermissionPatternOwnedByPlugin(manifest.id, rule.permissionPattern),
      ),
    "Each security policy rule pattern must belong to the manifest plugin id",
    "security_policy_rule_ownership_violation",
  );

type ParsedPluginManifest = Infer<typeof pluginManifestSchema>;

/**
 * Validates manifest shape and normalizes data for runtime usage.
 */
export function validatePluginManifest(input: unknown): PluginManifest {
  try {
    const parsed: ParsedPluginManifest = pluginManifestSchema.parse(input);
    const dependencies = (parsed.dependencies ?? []).map((dependency) => ({
      pluginId: dependency.pluginId,
      versionRange: dependency.versionRange,
      optional: dependency.optional,
    }));

    return {
      id: parsed.id,
      version: parsed.version,
      requiresCore: parsed.requiresCore,
      capabilities: [...(parsed.capabilities ?? [])],
      dependencies,
      ...(parsed.security
        ? {
            security: {
              permissions: [...(parsed.security.permissions ?? [])],
              roles: [...(parsed.security.roles ?? [])],
              grants: [...(parsed.security.grants ?? [])],
              policyRules: [...(parsed.security.policyRules ?? [])],
            },
          }
        : {}),
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new PluginManifestError(
        formatValidationError(error, {
          prefix: "Invalid plugin manifest:",
          rootLabel: "manifest",
        }),
        {
          issues: error.issues,
        },
      );
    }
    throw new PluginManifestError("Unexpected plugin manifest validation error", {
      cause: String(error),
    });
  }
}

/**
 * Ensures a validated manifest is compatible with the current core version.
 */
export function assertPluginCompatibility(
  manifest: PluginManifest,
  coreVersion: string,
): void {
  if (!isValidVersion(coreVersion)) {
    throw new PluginCompatibilityError("Current core version is not valid semver", {
      coreVersion,
      pluginId: manifest.id,
    });
  }

  if (!satisfiesVersion(coreVersion, manifest.requiresCore)) {
    throw new PluginCompatibilityError(
      `Plugin "${manifest.id}" requires core version "${manifest.requiresCore}" but current version is "${coreVersion}"`,
      {
        pluginId: manifest.id,
        required: manifest.requiresCore,
        current: coreVersion,
      },
    );
  }
}
