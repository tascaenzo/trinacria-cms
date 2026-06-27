import type {
  PluginManifest,
  PluginManifestAdminNavigation,
  PluginManifestAdminResource,
  PluginManifestAdminRoute,
  PluginManifestAdminSettingsSection,
  PluginManifestAdminWidget,
  PluginManifestEmittedEvent,
  PluginManifestEntity,
  PluginManifestEventSubscription,
  PluginManifestSetting
} from "./plugin-manifest.js";
export type {
  PluginEventSubscriptionAuthorizationRequest,
  PluginEventSubscriptionAuthorizer,
  PluginAccessAuthorizationResult as PluginEventSubscriptionAuthorizationResult
} from "./plugin-access-policy.js";
import type { ApplicationContext, ModuleDefinition } from "@trinacria/core";
import type { EventEnvelope } from "@trinacria/events";

/**
 * Lifecycle phases used for diagnostics when a plugin operation fails.
 */
export type PluginLifecyclePhase =
  | "register"
  | "dependency-check"
  | "load"
  | "init"
  | "unload"
  | "rollback";

export type PluginRuntimeOperation = "load" | "unload" | "reload" | "disable" | "enable";

export interface PluginRuntimeOperationAvailability {
  operation: PluginRuntimeOperation;
  available: boolean;
  reason?: string;
}

export interface PluginRuntimeDiagnostic {
  name: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PluginRuntimeStatusReason {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Runtime context passed to plugin hooks.
 */
export interface KernelPluginRuntimeContext {
  app: ApplicationContext;
  pluginId: string;
  manifest: PluginManifest;
  events: PluginEventPublisher;
}

export interface PluginEventPublisher {
  emit(eventName: string, payload: unknown): Promise<void>;
}

/**
 * Runtime-level hooks executed by the plugin orchestrator itself.
 * They are useful for cross-cutting orchestration (for example security provisioning)
 * without coupling plugin domain code into the runtime implementation.
 */
export interface PluginRuntimeLifecycleHooks {
  /**
   * Called after plugin modules/hooks completed successfully and before
   * finalizing the plugin as loaded.
   */
  onAfterLoad?(context: KernelPluginRuntimeContext): Promise<void> | void;
  /**
   * Called before unregistering a plugin definition from the runtime catalog.
   */
  onBeforeUnregister?(context: KernelPluginRuntimeContext): Promise<void> | void;
}

/**
 * Optional plugin hooks managed by the CMS kernel runtime.
 * They are distinct from Trinacria plugin hooks and scoped to CMS plugins.
 */
export interface KernelPluginHooks {
  onLoad?(context: KernelPluginRuntimeContext): Promise<void> | void;
  onInit?(context: KernelPluginRuntimeContext): Promise<void> | void;
  onUnload?(context: KernelPluginRuntimeContext): Promise<void> | void;
}

export interface KernelPluginEventHandlerContext {
  app: ApplicationContext;
  pluginId: string;
  eventName: string;
  handlerName: string;
}

export type KernelPluginEventHandler = (
  payload: unknown,
  envelope: EventEnvelope,
  context: KernelPluginEventHandlerContext
) => Promise<void> | void;

/**
 * Full plugin definition accepted by the kernel runtime.
 * It binds a manifest to runtime modules and optional lifecycle hooks.
 */
export interface KernelPluginDefinition extends KernelPluginHooks {
  manifest: PluginManifest;
  modules?: readonly ModuleDefinition[];
  eventHandlers?: Readonly<Record<string, KernelPluginEventHandler>>;
}

export interface PluginRuntimeRetryPolicy {
  maxAttempts: number;
  backoffMs?: number;
}

export interface PluginRuntimeEvent {
  sequence: number;
  timestamp: Date;
  pluginId: string;
  action:
    | "register"
    | "unregister"
    | "load"
    | "unload"
    | "reload"
    | "disable"
    | "enable"
    | "load-many";
  phase?: PluginLifecyclePhase;
  success: boolean;
  message?: string;
  durationMs?: number;
  stateBefore?: PluginState;
  stateAfter?: PluginState;
  details?: Record<string, unknown>;
}

export interface PluginDependencyEdgeSnapshot {
  from: string;
  to: string;
  optional: boolean;
  requiredRange: string;
  status: "ok" | "missing" | "disabled" | "version-mismatch";
  currentVersion?: string;
}

export interface PluginDependencyGraphSnapshot {
  nodes: Array<{
    pluginId: string;
    state: PluginState;
    version: string;
  }>;
  edges: PluginDependencyEdgeSnapshot[];
  warnings: string[];
}

export interface PluginContributionSnapshot<TDeclaration> {
  pluginId: string;
  key: string;
  declaration: TDeclaration;
}

export interface PluginAdminContributionSnapshot {
  navigation: readonly PluginContributionSnapshot<PluginManifestAdminNavigation>[];
  routes: readonly PluginContributionSnapshot<PluginManifestAdminRoute>[];
  resources: readonly PluginContributionSnapshot<PluginManifestAdminResource>[];
  widgets: readonly PluginContributionSnapshot<PluginManifestAdminWidget>[];
  settingsSections: readonly PluginContributionSnapshot<PluginManifestAdminSettingsSection>[];
}

export interface PluginEventContributionSnapshot {
  emits: readonly PluginContributionSnapshot<PluginManifestEmittedEvent>[];
  subscribes: readonly PluginContributionSnapshot<PluginManifestEventSubscription>[];
}

export interface PluginContributionCatalogSnapshot {
  entities: readonly PluginContributionSnapshot<PluginManifestEntity>[];
  settings: readonly PluginContributionSnapshot<PluginManifestSetting>[];
  events: PluginEventContributionSnapshot;
  admin: PluginAdminContributionSnapshot;
}

/**
 * Plugin lifecycle states inside the runtime registry.
 * The concrete state machine will be enforced by the orchestrator.
 */
export type PluginState =
  | "registered"
  | "loading"
  | "initializing"
  | "loaded"
  | "unloading"
  | "failed"
  | "disabled"
  | "unloaded";

/**
 * Runtime snapshot of a registered plugin.
 * Useful for listing, health checks, and operational audit.
 */
export interface PluginRuntimeRecord {
  /** Declarative plugin manifest. */
  manifest: PluginManifest;
  /** Current runtime lifecycle state. */
  state: PluginState;
  /** Timestamp set when the plugin enters loaded state. */
  loadedAt?: Date;
  /** Last relevant error during load/unload/lifecycle hooks. */
  lastError?: Error;
  /** Number of failed lifecycle attempts since runtime bootstrap. */
  failureCount?: number;
  /** Timestamp of the latest failure. */
  failedAt?: Date;
  /** Lifecycle phase where the latest failure happened. */
  lastFailurePhase?: PluginLifecyclePhase;
  /** Timestamp set when plugin becomes disabled. */
  disabledAt?: Date;
  /** Persistent disable reason (manual/operator choice). */
  disabledReason?: string;
  /** Runtime-facing explanation of the current plugin state. */
  statusReason?: PluginRuntimeStatusReason;
}

/**
 * Minimal contract for the plugin registry/orchestrator.
 * Exposes runtime management operations without constraining implementation.
 */
export interface PluginRuntime {
  /**
   * Registers a plugin definition (or just a manifest) in the catalog
   * without starting it.
   */
  register(plugin: PluginManifest | KernelPluginDefinition): Promise<void>;
  /** Loads and initializes a plugin. */
  load(pluginId: string): Promise<void>;
  /** Unloads a plugin and releases resources. */
  unload(pluginId: string): Promise<void>;
  /**
   * Performs an unload/load cycle using the latest registered definition.
   * Useful for safe runtime module reload.
   */
  reload(pluginId: string): Promise<void>;
  /**
   * Removes a plugin definition from the runtime catalog.
   * Plugin must not be loaded and must have no registered required dependents.
   */
  unregister(pluginId: string): Promise<void>;
  /**
   * Loads multiple plugins in topological order based on required dependencies.
   */
  loadMany(pluginIds?: readonly string[]): Promise<void>;
  /** Disables a plugin to prevent activation. */
  disable(pluginId: string, reason?: string): Promise<void>;
  /** Re-enables a disabled plugin without loading it automatically. */
  enable(pluginId: string): Promise<void>;
  /** Returns a read-only view of all plugin runtime states. */
  list(): readonly PluginRuntimeRecord[];
  /** Returns the current dependency graph and warnings. */
  describeDependencies(): PluginDependencyGraphSnapshot;
  /** Returns manifest-derived plugin contributions indexed by canonical keys. */
  describeContributions(): PluginContributionCatalogSnapshot;
  /** Returns recent lifecycle events for diagnostics and audit. */
  events(options?: { pluginId?: string; limit?: number }): readonly PluginRuntimeEvent[];
  /**
   * Emits an event on behalf of a loaded plugin.
   * Implementations must enforce manifest-declared event contracts.
   */
  emitPluginEvent(pluginId: string, eventName: string, payload: unknown): Promise<void>;
}
