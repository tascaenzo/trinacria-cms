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

export type PluginManifestSettingType = "string" | "number" | "boolean" | "json" | "secret";

export type PluginManifestSettingVisibility = "public" | "protected" | "secret";

/**
 * Declarative setting owned by a plugin.
 * The canonical key is `<pluginId>:<namespace>:<key>`.
 */
export interface PluginManifestSetting {
  namespace: string;
  key: string;
  type: PluginManifestSettingType;
  visibility: PluginManifestSettingVisibility;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
  defaultValueJson?: string;
}

export type PluginManifestEntityIndexDirection = 1 | -1 | "text";

export interface PluginManifestEntityIndex {
  name: string;
  fields: Record<string, PluginManifestEntityIndexDirection>;
  unique?: boolean;
  sparse?: boolean;
  partialFilter?: Record<string, unknown>;
}

export interface PluginManifestEntityRepository {
  mode: "standard" | "custom";
  token?: string;
}

/**
 * Declarative Mongo-backed entity contributed by a plugin.
 * Entity names are plugin-local and become globally canonical through plugin ownership.
 */
export interface PluginManifestEntity {
  name: string;
  collection?: string;
  displayName?: string;
  schemaVersion: number;
  documentSchema?: Record<string, unknown>;
  indexes?: readonly PluginManifestEntityIndex[];
  repository?: PluginManifestEntityRepository;
}

export type PluginManifestEventVisibility = "public" | "protected" | "private" | "audit";

export type PluginManifestEventDelivery = "sync" | "async" | "deferred";

export interface PluginManifestEmittedEvent {
  name: string;
  visibility: PluginManifestEventVisibility;
  version: number;
  delivery?: PluginManifestEventDelivery;
  payloadSchema?: Record<string, unknown>;
}

export interface PluginManifestEventSubscription {
  eventName: string;
  handler: string;
  requiredPermission?: string;
}

export interface PluginManifestEvents {
  emits?: readonly PluginManifestEmittedEvent[];
  subscribes?: readonly PluginManifestEventSubscription[];
}

export interface PluginManifestAdminNavigation {
  id: string;
  label: string;
  path?: string;
  requiredPermission?: string;
  order?: number;
}

export interface PluginManifestAdminRoute {
  id: string;
  path: string;
  label: string;
  requiredPermission?: string;
  componentRef?: string;
}

export interface PluginManifestAdminResource {
  id: string;
  label: string;
  routeBase: string;
  apiBase: string;
  requiredPermission?: string;
}

export interface PluginManifestAdminWidget {
  id: string;
  label: string;
  requiredPermission?: string;
  componentRef?: string;
}

export interface PluginManifestAdminSettingsSection {
  id: string;
  label: string;
  namespace: string;
  requiredPermission?: string;
}

export interface PluginManifestAdmin {
  navigation?: readonly PluginManifestAdminNavigation[];
  routes?: readonly PluginManifestAdminRoute[];
  resources?: readonly PluginManifestAdminResource[];
  widgets?: readonly PluginManifestAdminWidget[];
  settingsSections?: readonly PluginManifestAdminSettingsSection[];
}

/**
 * Minimal public metadata describing an installable plugin.
 * This contract is input for the runtime plugin registry.
 */
export interface PluginManifest {
  /** Stable and unique plugin ID. */
  id: string;
  /** Human-readable plugin name for admin surfaces and registries. */
  displayName?: string;
  /** Short functional description. */
  description?: string;
  /** Plugin version (semver). */
  version: string;
  /** Required `@trinacria-cms/kernel` kernel version range. */
  requiresCore: string;
  /** Exposed functional capabilities (e.g. "content.read", "media.write"). */
  capabilities?: readonly string[];
  /** Dependencies toward other plugins. */
  dependencies?: readonly PluginManifestDependency[];
  /** Mongo-backed entities contributed by the plugin. */
  entities?: readonly PluginManifestEntity[];
  /** Centralized settings definitions contributed by the plugin. */
  settings?: readonly PluginManifestSetting[];
  /** Event contracts emitted or consumed by the plugin. */
  events?: PluginManifestEvents;
  /** Declarative admin/backoffice contribution points. */
  admin?: PluginManifestAdmin;
  /** Optional security declarations to be provisioned by a security service. */
  security?: PluginManifestSecurity;
}
