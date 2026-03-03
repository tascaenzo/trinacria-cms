import { CoreError } from "./core-error.js";

/**
 * Raised when a plugin manifest is missing required fields
 * or contains invalid data.
 */
export class PluginManifestError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("PLUGIN_MANIFEST_ERROR", message, { details });
  }
}

/**
 * Raised when a plugin cannot run with the current core version.
 */
export class PluginCompatibilityError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("PLUGIN_COMPATIBILITY_ERROR", message, { details });
  }
}

/**
 * Raised when runtime plugin operations fail (load/unload/disable/register).
 */
export class PluginRuntimeError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("PLUGIN_RUNTIME_ERROR", message, { details });
  }
}

/**
 * Raised when dependency graph rules are violated
 * (missing dependency, invalid version, cycle, unsafe unload).
 */
export class PluginDependencyError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("PLUGIN_DEPENDENCY_ERROR", message, { details });
  }
}

/**
 * Raised when a runtime operation tries to move a plugin
 * from one state to another using an invalid transition.
 */
export class PluginStateTransitionError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("PLUGIN_STATE_TRANSITION_ERROR", message, { details });
  }
}

/**
 * Raised when plugin lifecycle hooks or module bridge operations fail.
 */
export class PluginLifecycleError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("PLUGIN_LIFECYCLE_ERROR", message, { details });
  }
}
