import type { PluginManifest } from "../contracts/plugin-manifest.js";
import { ValidationError, formatValidationError, s, type Infer } from "@trinacria/schema";
import { PluginCompatibilityError, PluginManifestError } from "../errors/plugin-errors.js";
import { isValidVersion, isValidVersionRange, satisfiesVersion } from "./semver.js";
import {
  isPermissionOwnedByPlugin,
  isPermissionPatternOwnedByPlugin,
  isValidPermissionKey,
  isValidPermissionPattern
} from "./permission-key.js";
import {
  buildContributionKey,
  buildSettingKey,
  findContributionCollisions,
  isReservedNamespaceSegment,
  isValidNamespaceSegment,
  isValidPluginId
} from "./plugin-namespace.js";

const pluginDependencySchema = s.object(
  {
    pluginId: s
      .string({ trim: true, toLowerCase: true, minLength: 1 })
      .refine(
        (value) => isValidPluginId(value),
        "Dependency pluginId is invalid or reserved",
        "invalid_plugin_id"
      ),
    versionRange: s
      .string({ trim: true, minLength: 1 })
      .refine(
        (value) => isValidVersionRange(value),
        "Dependency versionRange is not a supported semver range",
        "invalid_version_range"
      ),
    optional: s.boolean().optional().default(false)
  },
  { strict: true }
);

const namespaceSegmentSchema = s
  .string({ trim: true, toLowerCase: true, minLength: 1, maxLength: 80 })
  .refine(
    (value) => isValidNamespaceSegment(value),
    "Namespace segment is invalid or reserved",
    "invalid_namespace_segment"
  );

const publicPathSchema = s.string({ trim: true, minLength: 1, maxLength: 180, startsWith: "/" });

const looseObjectSchema = s.object({}, { strict: false });

const entityIndexDirectionSchema = s.union([s.literal(1), s.literal(-1), s.literal("text")]);

const entityIndexSchema = s.object(
  {
    name: namespaceSegmentSchema,
    fields: s
      .record(s.string({ trim: true, minLength: 1, maxLength: 120 }), entityIndexDirectionSchema)
      .refine(
        (value) => Object.keys(value).length > 0,
        "Index fields cannot be empty",
        "empty_index"
      ),
    unique: s.boolean().optional().default(false),
    sparse: s.boolean().optional().default(false),
    partialFilter: looseObjectSchema.optional()
  },
  { strict: true }
);

const entityRepositorySchema = s.object(
  {
    mode: s.enum(["standard", "custom"] as const),
    token: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional()
  },
  { strict: true }
);

const entitySchema = s.object(
  {
    name: namespaceSegmentSchema,
    collection: s
      .string({ trim: true, toLowerCase: true, minLength: 1, maxLength: 120 })
      .refine(
        (value) => /^[a-z0-9][a-z0-9._-]*$/.test(value) && !isReservedNamespaceSegment(value),
        "Entity collection is invalid or reserved",
        "invalid_entity_collection"
      )
      .optional(),
    displayName: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    schemaVersion: s.number({ int: true, min: 1 }),
    documentSchema: looseObjectSchema.optional(),
    indexes: s
      .array(entityIndexSchema, {
        unique: (index) => index.name
      })
      .optional()
      .default([]),
    repository: entityRepositorySchema.optional()
  },
  { strict: true }
);

const settingSchema = s.object(
  {
    namespace: namespaceSegmentSchema,
    key: namespaceSegmentSchema,
    type: s.enum(["string", "number", "boolean", "json", "secret"] as const),
    visibility: s.enum(["public", "protected", "secret"] as const),
    required: s.boolean().optional().default(false),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    schema: looseObjectSchema.optional(),
    defaultValueJson: s.string({ minLength: 2, maxLength: 200000 }).optional()
  },
  { strict: true }
);

const emittedEventSchema = s.object(
  {
    name: namespaceSegmentSchema,
    visibility: s.enum(["public", "protected", "private", "audit"] as const),
    version: s.number({ int: true, min: 1 }),
    delivery: s
      .enum(["sync", "async", "deferred"] as const)
      .optional()
      .default("async"),
    payloadSchema: looseObjectSchema.optional()
  },
  { strict: true }
);

const eventSubscriptionSchema = s.object(
  {
    eventName: s.string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 180 }).refine(
      (value) => {
        const [pluginId, eventName, ...rest] = value.split(":");
        return (
          rest.length === 0 &&
          Boolean(pluginId) &&
          Boolean(eventName) &&
          isValidPluginId(pluginId) &&
          isValidNamespaceSegment(eventName)
        );
      },
      "Subscribed eventName must be '<pluginId>:<eventName>'",
      "invalid_subscribed_event_name"
    ),
    handler: s.string({ trim: true, minLength: 1, maxLength: 180 }),
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional()
  },
  { strict: true }
);

const eventsSchema = s.object(
  {
    emits: s
      .array(emittedEventSchema, {
        unique: (event) => event.name
      })
      .optional()
      .default([]),
    subscribes: s
      .array(eventSubscriptionSchema, {
        unique: (subscription) => `${subscription.eventName}|${subscription.handler}`
      })
      .optional()
      .default([])
  },
  { strict: true }
);

const adminNavigationSchema = s.object(
  {
    id: namespaceSegmentSchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    path: publicPathSchema.optional(),
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional(),
    order: s.number({ int: true }).optional()
  },
  { strict: true }
);

const adminRouteSchema = s.object(
  {
    id: namespaceSegmentSchema,
    path: publicPathSchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional(),
    componentRef: s.string({ trim: true, minLength: 1, maxLength: 180 }).optional()
  },
  { strict: true }
);

const adminResourceSchema = s.object(
  {
    id: namespaceSegmentSchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    routeBase: publicPathSchema,
    apiBase: publicPathSchema,
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional()
  },
  { strict: true }
);

const adminWidgetSchema = s.object(
  {
    id: namespaceSegmentSchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional(),
    componentRef: s.string({ trim: true, minLength: 1, maxLength: 180 }).optional()
  },
  { strict: true }
);

const adminSettingsSectionSchema = s.object(
  {
    id: namespaceSegmentSchema,
    label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    namespace: namespaceSegmentSchema,
    requiredPermission: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionKey(value),
        "requiredPermission must be '<pluginId>:<resource>:<action>'",
        "invalid_required_permission"
      )
      .optional()
  },
  { strict: true }
);

const adminSchema = s.object(
  {
    navigation: s
      .array(adminNavigationSchema, {
        unique: (item) => item.id
      })
      .optional()
      .default([]),
    routes: s
      .array(adminRouteSchema, {
        unique: (route) => route.id
      })
      .optional()
      .default([]),
    resources: s
      .array(adminResourceSchema, {
        unique: (resource) => resource.id
      })
      .optional()
      .default([]),
    widgets: s
      .array(adminWidgetSchema, {
        unique: (widget) => widget.id
      })
      .optional()
      .default([]),
    settingsSections: s
      .array(adminSettingsSectionSchema, {
        unique: (section) => section.id
      })
      .optional()
      .default([])
  },
  { strict: true }
);

const securityPermissionSchema = s.object(
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

const pluginManifestSchema = s
  .object(
    {
      id: s
        .string({ trim: true, toLowerCase: true, minLength: 1 })
        .refine(
          (value) => isValidPluginId(value),
          "Plugin id is invalid or reserved",
          "invalid_plugin_id"
        ),
      displayName: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
      description: s.string({ trim: true, maxLength: 500 }).optional(),
      version: s
        .string({ trim: true, minLength: 1 })
        .refine(
          (value) => isValidVersion(value),
          "Plugin version must be a valid semver",
          "invalid_semver_version"
        ),
      requiresCore: s
        .string({ trim: true, minLength: 1 })
        .refine(
          (value) => isValidVersionRange(value),
          "requiresCore must be a supported semver range",
          "invalid_core_range"
        ),
      capabilities: s
        .array(s.string({ trim: true, minLength: 1, pattern: /^[a-z0-9][a-z0-9._-]*$/ }), {
          unique: true
        })
        .optional()
        .default([]),
      dependencies: s
        .array(pluginDependencySchema, {
          unique: (dependency) => dependency.pluginId
        })
        .optional()
        .default([]),
      entities: s
        .array(entitySchema, {
          unique: (entity) => entity.name
        })
        .optional()
        .default([]),
      settings: s
        .array(settingSchema, {
          unique: (setting) => `${setting.namespace}:${setting.key}`
        })
        .optional()
        .default([]),
      events: eventsSchema.optional(),
      admin: adminSchema.optional(),
      security: s
        .object(
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
                  `${rule.roleCode}|${rule.effect}|${rule.permissionPattern}|${(
                    rule.conditions ?? []
                  ).join(",")}`
              })
              .optional()
              .default([])
          },
          { strict: true }
        )
        .optional()
    },
    { strict: true }
  )
  .refine(
    (manifest) =>
      (manifest.dependencies ?? []).every((dependency) => dependency.pluginId !== manifest.id),
    "Plugin cannot depend on itself",
    "self_dependency"
  )
  .refine(
    (manifest) =>
      (manifest.security?.permissions ?? []).every((permission) =>
        isPermissionOwnedByPlugin(manifest.id, permission.key)
      ),
    "Each security permission key must belong to the manifest plugin id",
    "security_permission_ownership_violation"
  )
  .refine(
    (manifest) =>
      (manifest.security?.grants ?? []).every((grant) =>
        grant.permissionKeys.every((permissionKey) =>
          isPermissionOwnedByPlugin(manifest.id, permissionKey)
        )
      ),
    "Each security grant permission key must belong to the manifest plugin id",
    "security_grant_ownership_violation"
  )
  .refine(
    (manifest) =>
      (manifest.security?.policyRules ?? []).every((rule) =>
        isPermissionPatternOwnedByPlugin(manifest.id, rule.permissionPattern)
      ),
    "Each security policy rule pattern must belong to the manifest plugin id",
    "security_policy_rule_ownership_violation"
  )
  .refine(
    (manifest) => {
      const keys = (manifest.entities ?? []).map((entity) =>
        buildContributionKey(manifest.id, entity.name)
      );
      return findContributionCollisions("entity", keys).length === 0;
    },
    "Each entity contribution must have a unique canonical key",
    "entity_collision"
  )
  .refine(
    (manifest) => {
      const keys = (manifest.settings ?? []).map((setting) =>
        buildSettingKey(manifest.id, setting.namespace, setting.key)
      );
      return findContributionCollisions("setting", keys).length === 0;
    },
    "Each setting contribution must have a unique canonical key",
    "setting_collision"
  )
  .refine(
    (manifest) => {
      const keys = (manifest.events?.emits ?? []).map((event) =>
        buildContributionKey(manifest.id, event.name)
      );
      return findContributionCollisions("event", keys).length === 0;
    },
    "Each emitted event contribution must have a unique canonical key",
    "event_collision"
  )
  .refine(
    (manifest) => {
      const permissionRefs = [
        ...(manifest.events?.subscribes ?? []).map(
          (subscription) => subscription.requiredPermission
        ),
        ...(manifest.admin?.navigation ?? []).map((item) => item.requiredPermission),
        ...(manifest.admin?.routes ?? []).map((route) => route.requiredPermission),
        ...(manifest.admin?.resources ?? []).map((resource) => resource.requiredPermission),
        ...(manifest.admin?.widgets ?? []).map((widget) => widget.requiredPermission),
        ...(manifest.admin?.settingsSections ?? []).map((section) => section.requiredPermission)
      ].filter((permission): permission is string => Boolean(permission));

      return permissionRefs.every((permission) =>
        isPermissionOwnedByPlugin(manifest.id, permission)
      );
    },
    "Each requiredPermission reference must belong to the manifest plugin id",
    "required_permission_ownership_violation"
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
      optional: dependency.optional
    }));

    return {
      id: parsed.id,
      ...(parsed.displayName ? { displayName: parsed.displayName } : {}),
      ...(parsed.description ? { description: parsed.description } : {}),
      version: parsed.version,
      requiresCore: parsed.requiresCore,
      capabilities: [...(parsed.capabilities ?? [])],
      dependencies,
      entities: [...(parsed.entities ?? [])],
      settings: [...(parsed.settings ?? [])],
      ...(parsed.events
        ? {
            events: {
              emits: [...(parsed.events.emits ?? [])],
              subscribes: [...(parsed.events.subscribes ?? [])]
            }
          }
        : {}),
      ...(parsed.admin
        ? {
            admin: {
              navigation: [...(parsed.admin.navigation ?? [])],
              routes: [...(parsed.admin.routes ?? [])],
              resources: [...(parsed.admin.resources ?? [])],
              widgets: [...(parsed.admin.widgets ?? [])],
              settingsSections: [...(parsed.admin.settingsSections ?? [])]
            }
          }
        : {}),
      ...(parsed.security
        ? {
            security: {
              permissions: [...(parsed.security.permissions ?? [])],
              roles: [...(parsed.security.roles ?? [])],
              grants: [...(parsed.security.grants ?? [])],
              policyRules: [...(parsed.security.policyRules ?? [])]
            }
          }
        : {})
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new PluginManifestError(
        formatValidationError(error, {
          prefix: "Invalid plugin manifest:",
          rootLabel: "manifest"
        }),
        {
          issues: error.issues
        }
      );
    }
    throw new PluginManifestError("Unexpected plugin manifest validation error", {
      cause: String(error)
    });
  }
}

/**
 * Ensures a validated manifest is compatible with the current core version.
 */
export function assertPluginCompatibility(manifest: PluginManifest, coreVersion: string): void {
  if (!isValidVersion(coreVersion)) {
    throw new PluginCompatibilityError("Current core version is not valid semver", {
      coreVersion,
      pluginId: manifest.id
    });
  }

  if (!satisfiesVersion(coreVersion, manifest.requiresCore)) {
    throw new PluginCompatibilityError(
      `Plugin "${manifest.id}" requires core version "${manifest.requiresCore}" but current version is "${coreVersion}"`,
      {
        pluginId: manifest.id,
        required: manifest.requiresCore,
        current: coreVersion
      }
    );
  }
}
