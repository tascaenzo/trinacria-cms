import type {
  PluginManifest,
  PluginManifestSetting,
  PluginManifestSettingType,
  PluginManifestSettingVisibility
} from "../../contracts/plugin-manifest.js";
import { ValidationError, formatValidationError, s, type Infer } from "@trinacria/schema";
import { PluginCompatibilityError, PluginManifestError } from "../../errors/plugin-errors.js";
import { isValidVersion, isValidVersionRange, satisfiesVersion } from "./semver.js";
import {
  isPermissionOwnedByPlugin,
  isPermissionPatternOwnedByPlugin
} from "../plugin-namespace/permission-key.js";
import {
  buildContributionKey,
  buildSettingKey,
  findContributionCollisions,
  isValidPluginId,
  isValidNamespaceSegment
} from "../plugin-namespace/plugin-namespace.js";
import {
  entitySchema,
  settingSchema,
  settingV2Schema,
  eventsSchema,
  adminSchema,
  type NormalizedManifestSetting
} from "./plugin-manifest-contributions.js";
import { securitySectionSchema } from "./plugin-manifest-security.js";

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
        .array(s.union([settingSchema, settingV2Schema]), {
          unique: (setting) => {
            if ("namespace" in setting) {
              return `${setting.namespace}:${setting.key}`;
            }
            return setting.key;
          }
        })
        .optional()
        .default([]),
      events: eventsSchema.optional(),
      admin: adminSchema.optional(),
      security: securitySectionSchema.optional()
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
      const keys = (manifest.settings ?? []).map((setting) => {
        if ("namespace" in setting) {
          return buildSettingKey(manifest.id, setting.namespace, setting.key);
        }
        return setting.key;
      });
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

function normalizeManifestSettings(
  pluginId: string,
  settings: readonly (Infer<typeof settingSchema> | Infer<typeof settingV2Schema>)[]
): PluginManifestSetting[] {
  return settings.map((s) => {
    if ("namespace" in s) {
      // v1 format — pass through as-is
      return s as PluginManifestSetting;
    }
    // v2 format — convert to v1 for backward compatibility
    const parts = s.key.split(":");
    const namespace = parts[1]!;
    const key = parts[2]!;

    let type: PluginManifestSettingType = "string";
    if (s.secret) {
      type = "secret";
    } else if (s.schema && typeof s.schema === "object" && "type" in s.schema) {
      const schemaType = (s.schema as Record<string, unknown>).type;
      if (schemaType === "number" || schemaType === "boolean") {
        type = schemaType;
      }
    }

    const visibilityMap: Record<string, PluginManifestSettingVisibility> = {
      public: "public",
      admin: "protected",
      internal: "secret"
    };
    const visibility = visibilityMap[s.visibility ?? "public"] ?? "public";

    return {
      namespace,
      key,
      type,
      visibility,
      required: s.defaultValue === undefined,
      description: s.description,
      schema: s.schema as Record<string, unknown> | undefined,
      defaultValueJson: s.defaultValue !== undefined ? JSON.stringify(s.defaultValue) : undefined
    };
  });
}

export function validatePluginManifest(input: unknown): PluginManifest {
  try {
    const parsed: ParsedPluginManifest = pluginManifestSchema.parse(input);
    const dependencies = (parsed.dependencies ?? []).map((dependency) => ({
      pluginId: dependency.pluginId,
      versionRange: dependency.versionRange,
      optional: dependency.optional
    }));

    const normalizedSettings = normalizeManifestSettings(parsed.id, parsed.settings ?? []);

    return {
      id: parsed.id,
      ...(parsed.displayName ? { displayName: parsed.displayName } : {}),
      ...(parsed.description ? { description: parsed.description } : {}),
      version: parsed.version,
      requiresCore: parsed.requiresCore,
      capabilities: [...(parsed.capabilities ?? [])],
      dependencies,
      entities: [...(parsed.entities ?? [])],
      settings: normalizedSettings,
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
