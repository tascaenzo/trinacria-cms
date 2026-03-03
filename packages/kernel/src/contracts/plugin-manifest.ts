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
}
