import type {
  PluginLifecyclePhase,
  PluginRuntimeRecord,
  PluginRuntimeStatusReason,
  PluginState
} from "./plugin-runtime.js";
import type { PluginManifest } from "./plugin-manifest.js";

/**
 * Persisted snapshot of a plugin runtime record.
 * This shape is storage-facing and optimized for operational queries.
 */
export interface PersistedPluginRuntimeRecord {
  id?: string;
  pluginId: string;
  version: string;
  state: PluginState;
  enabled: boolean;
  failureCount: number;
  lastFailurePhase?: PluginLifecyclePhase;
  lastErrorCode?: string;
  lastErrorName?: string;
  lastErrorMessage?: string;
  lastErrorDetails?: Record<string, unknown>;
  statusReason?: PluginRuntimeStatusReason;
  disabledReason?: string;
  manifest: PluginManifest;
  loadedAt?: string;
  failedAt?: string;
  disabledAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Optional persistence backend for plugin runtime state.
 * Implementations can be in-memory or database-backed.
 */
export interface PluginRuntimeStore {
  /**
   * Performs one-time store setup (for example index creation).
   */
  initialize(): Promise<void>;
  /**
   * Upserts runtime state for one plugin.
   */
  upsert(record: PluginRuntimeRecord): Promise<void>;
  /**
   * Removes runtime state for one plugin.
   */
  remove(pluginId: string): Promise<void>;
  /**
   * Lists currently persisted plugin runtime records.
   */
  list(): Promise<readonly PersistedPluginRuntimeRecord[]>;
}
