/**
 * Dependency declared by a plugin toward another plugin.
 * Used by runtime for compatibility validation and load ordering.
 */
export interface PluginManifestDependency {
  /** Plugin required by the current plugin. */
  pluginId: string;
  /** Accepted semver version range. */
  versionRange: string;
  /** If true, the dependency may be missing without blocking load. */
  optional?: boolean;
}

/**
 * Declarative permission contributed by a plugin.
 * `key` must be namespaced as `<pluginId>:<resource>:<action>`.
 */
export interface PluginManifestSecurityPermission {
  key: string;
  displayName: string;
  description?: string;
}

/**
 * Declarative role owned by a plugin.
 * Other plugins can contribute grants to this role, but only the owner plugin
 * is allowed to manage role metadata.
 */
export interface PluginManifestSecurityRole {
  code: string;
  name: string;
  description?: string;
}

/**
 * Declarative grants contributed by a plugin.
 * Each grant targets one role and contributes plugin-owned permission keys.
 */
export interface PluginManifestSecurityGrant {
  roleCode: string;
  permissionKeys: readonly string[];
}

/**
 * Optional condition attached to policy rules.
 * Conditions are evaluated at authorization time.
 */
export type PluginManifestSecurityPolicyCondition =
  | "resource_id_required"
  | "resource_id_equals_subject";

/**
 * Declarative policy rule contributed by a plugin.
 * Rules can be wildcard-based and can either allow or deny.
 */
export interface PluginManifestSecurityPolicyRule {
  roleCode: string;
  effect: "allow" | "deny";
  permissionPattern: string;
  conditions?: readonly PluginManifestSecurityPolicyCondition[];
}

/**
 * Security section contributed by a plugin.
 * It is used by provisioning services to create/sync permissions, roles, and grants.
 */
export interface PluginManifestSecurity {
  permissions?: readonly PluginManifestSecurityPermission[];
  roles?: readonly PluginManifestSecurityRole[];
  grants?: readonly PluginManifestSecurityGrant[];
  policyRules?: readonly PluginManifestSecurityPolicyRule[];
}

/**
 * Minimal public metadata describing an installable plugin.
 * This contract is input for the runtime plugin registry.
 */
export interface PluginManifest {
  /** Stable and unique plugin ID. */
  id: string;
  /** Plugin version (semver). */
  version: string;
  /** Required `@trinacria-cms/kernel` kernel version range. */
  requiresCore: string;
  /** Exposed functional capabilities (e.g. "content.read", "media.write"). */
  capabilities?: readonly string[];
  /** Dependencies toward other plugins. */
  dependencies?: readonly PluginManifestDependency[];
  /** Optional security declarations to be provisioned by a security service. */
  security?: PluginManifestSecurity;
}
