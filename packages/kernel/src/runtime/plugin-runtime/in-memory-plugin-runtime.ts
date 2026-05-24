import type {
  PluginDependencyGraphSnapshot,
  KernelPluginDefinition,
  KernelPluginRuntimeContext,
  PluginRuntimeLifecycleHooks,
  PluginContributionCatalogSnapshot,
  PluginRuntimeEvent,
  PluginRuntimeRetryPolicy,
  PluginRuntime,
  PluginRuntimeRecord,
  PluginState
} from "../../contracts/plugin-runtime.js";
import type { PluginRuntimeStore } from "../../contracts/plugin-runtime-store.js";
import type { ApplicationContext } from "@trinacria/core";
import {
  PluginCompatibilityError,
  PluginDependencyError,
  PluginLifecycleError,
  PluginManifestError,
  PluginRuntimeError,
  PluginStateTransitionError
} from "../../errors/plugin-errors.js";
import {
  assertPluginCompatibility,
  validatePluginManifest
} from "../plugin-manifest/plugin-manifest-validation.js";
import {
  TrinacriaModuleBridge,
  type TrinacriaModuleBridgeApp
} from "../bridge/trinacria-module-bridge.js";
import { createInMemoryPluginRuntimeStore } from "../persistence/plugin-runtime-store.js";
import { PluginContributionRegistry } from "./plugin-runtime-contributions.js";
import { PluginRegistryManager } from "./plugin-runtime-registry.js";
import {
  assertDependencyGraphWithoutCycles,
  assertNoLoadedDependents,
  assertNoRegisteredDependents,
  describePluginDependencyGraph,
  extractRequiredDependencies,
  sortPluginsByDependencies
} from "./plugin-runtime-dependencies.js";
import { PluginRuntimeEventLog } from "./plugin-runtime-events.js";
import { createPluginStatusReason } from "./plugin-runtime-state-machine.js";
import { persistRecord, hydrateFromRuntimeStore } from "./plugin-runtime-persistence.js";
import {
  createLifecycleContext,
  loadPluginInternal,
  unloadPlugin
} from "./plugin-runtime-lifecycle.js";

export { type PluginRuntimeLifecycleHooks, type TrinacriaModuleBridge };

export interface InMemoryPluginRuntimeOptions {
  coreVersion: string;
  app?: ApplicationContext;
  lifecycleHooks?: PluginRuntimeLifecycleHooks;
  retryPolicy?: PluginRuntimeRetryPolicy;
  onEvent?: (event: PluginRuntimeEvent) => void;
  runtimeStore?: PluginRuntimeStore;
  eventBufferSize?: number;
}

export class InMemoryPluginRuntime implements PluginRuntime {
  readonly registry = new PluginRegistryManager();
  readonly loadedContributions = new PluginContributionRegistry();
  readonly runtimeStore: PluginRuntimeStore;

  private readonly coreVersion: string;
  private readonly app?: ApplicationContext;
  private readonly moduleBridge?: TrinacriaModuleBridge;
  private readonly lifecycleHooks?: PluginRuntimeLifecycleHooks;
  private readonly activeLoads = new Set<string>();
  private readonly retryPolicy?: PluginRuntimeRetryPolicy;
  private readonly eventsLog: PluginRuntimeEventLog;
  private runtimeStoreInitialization?: Promise<void>;
  private runtimeStoreHydrated = false;

  constructor(options: InMemoryPluginRuntimeOptions) {
    this.coreVersion = options.coreVersion;
    this.app = options.app;
    this.lifecycleHooks = options.lifecycleHooks;
    this.retryPolicy = options.retryPolicy;
    this.runtimeStore = options.runtimeStore ?? createInMemoryPluginRuntimeStore();
    this.eventsLog = new PluginRuntimeEventLog({
      bufferSize: options.eventBufferSize,
      onEvent: options.onEvent
    });

    if (options.app) {
      this.moduleBridge = new TrinacriaModuleBridge(options.app as TrinacriaModuleBridgeApp);
    }
  }

  async register(plugin: KernelPluginDefinition | PluginRuntimeRecord["manifest"]): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const startedAt = Date.now();
    let definition: KernelPluginDefinition;
    let manifest: PluginRuntimeRecord["manifest"];

    try {
      definition = this.registry.normalizeDefinition(plugin);
      manifest = validatePluginManifest(definition.manifest);
      assertPluginCompatibility(manifest, this.coreVersion);
      assertDependencyGraphWithoutCycles(
        manifest.id,
        extractRequiredDependencies(manifest),
        this.registry.records
      );
      this.registry.assertNamespaceValid(manifest);
    } catch (error) {
      if (
        error instanceof PluginManifestError ||
        error instanceof PluginCompatibilityError ||
        error instanceof PluginDependencyError
      ) {
        throw error;
      }
      throw new PluginRuntimeError("Unexpected error while registering plugin", {
        pluginId:
          typeof plugin === "object" && plugin !== null && "manifest" in plugin
            ? plugin.manifest.id
            : typeof plugin === "object" && plugin !== null && "id" in plugin
              ? plugin.id
              : undefined,
        cause: this.errorToString(error)
      });
    }

    const existing = this.registry.records.get(manifest.id);
    if (existing && existing.state === "loaded") {
      throw new PluginStateTransitionError(
        `Cannot register plugin "${manifest.id}" while it is loaded`,
        { pluginId: manifest.id, from: existing.state, action: "register" }
      );
    }

    if (existing?.state === "disabled" || existing?.state === "failed") {
      this.registry.registrationValidator.upsert(manifest);
      this.registry.registerNamespace(manifest);
      this.registry.definitions.set(manifest.id, { ...definition, manifest });
      this.registry.records.set(manifest.id, {
        ...existing,
        manifest
      });
      await persistRecord(this.registry.records, this.runtimeStore, manifest.id);
      this.emitEvent({
        pluginId: manifest.id,
        action: "register",
        success: true,
        durationMs: Date.now() - startedAt,
        stateBefore: existing.state,
        stateAfter: existing.state,
        message: `Plugin metadata updated while ${existing.state}`
      });
      return;
    }

    this.registry.registrationValidator.upsert(manifest);
    this.registry.registerNamespace(manifest);
    this.registry.definitions.set(manifest.id, { ...definition, manifest });
    this.registry.records.set(manifest.id, {
      manifest,
      state: "registered",
      lastError: undefined,
      lastFailurePhase: undefined,
      failedAt: undefined,
      disabledAt: undefined,
      disabledReason: undefined,
      statusReason: createPluginStatusReason("registered")
    });
    await persistRecord(this.registry.records, this.runtimeStore, manifest.id);
    this.emitEvent({
      pluginId: manifest.id,
      action: "register",
      success: true,
      durationMs: Date.now() - startedAt,
      stateBefore: existing?.state,
      stateAfter: "registered"
    });
  }

  async load(pluginId: string): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const record = this.registry.getRecord(pluginId);
    const startedAt = Date.now();
    if (this.activeLoads.has(pluginId)) {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is already loading`, { pluginId });
    }
    if (record.state === "disabled") {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is disabled`, { pluginId });
    }
    if (record.state === "loaded") return;
    if (!["registered", "unloaded", "failed"].includes(record.state)) {
      throw new PluginStateTransitionError(
        `Cannot load plugin "${pluginId}" from state "${record.state}"`,
        { pluginId, from: record.state, action: "load" }
      );
    }

    this.activeLoads.add(pluginId);
    try {
      const attempts = this.resolveAttempts(record.state);
      let lastError: unknown;

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const ctx = createLifecycleContext({
            records: this.registry.records,
            definitions: this.registry.definitions,
            pluginModules: this.registry.pluginModules,
            loadedContributions: this.loadedContributions,
            runtimeStore: this.runtimeStore,
            moduleBridge: this.moduleBridge,
            lifecycleHooks: this.lifecycleHooks,
            app: this.app
          });
          await loadPluginInternal(ctx, pluginId, new Set<string>());
          await persistRecord(this.registry.records, this.runtimeStore, pluginId);
          this.emitEvent({
            pluginId,
            action: "load",
            success: true,
            durationMs: Date.now() - startedAt,
            stateBefore: record.state,
            stateAfter: this.registry.getRecord(pluginId).state,
            details: { attempts: attempt }
          });
          return;
        } catch (error) {
          await persistRecord(this.registry.records, this.runtimeStore, pluginId);
          lastError = error;
          const shouldRetry = attempt < attempts && this.isRetryableLoadError(error);
          const failedRecord = this.registry.getRecord(pluginId);
          this.emitEvent({
            pluginId,
            action: "load",
            phase: failedRecord.lastFailurePhase,
            success: false,
            durationMs: Date.now() - startedAt,
            stateBefore: record.state,
            stateAfter: failedRecord.state,
            details: {
              attempt,
              attempts,
              retrying: shouldRetry,
              cause: this.errorToString(error),
              failureCount: failedRecord.failureCount,
              statusReason: failedRecord.statusReason
            }
          });
          if (!shouldRetry) throw error;
          await this.sleep(this.retryPolicy?.backoffMs ?? 0);
        }
      }

      throw lastError;
    } finally {
      this.activeLoads.delete(pluginId);
    }
  }

  async unload(pluginId: string): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const record = this.registry.getRecord(pluginId);
    const startedAt = Date.now();
    if (record.state === "disabled") return;
    if (record.state !== "loaded" && record.state !== "failed") {
      throw new PluginStateTransitionError(
        `Cannot unload plugin "${pluginId}" from state "${record.state}"`,
        { pluginId, from: record.state, action: "unload" }
      );
    }

    const ctx = createLifecycleContext({
      records: this.registry.records,
      definitions: this.registry.definitions,
      pluginModules: this.registry.pluginModules,
      loadedContributions: this.loadedContributions,
      runtimeStore: this.runtimeStore,
      moduleBridge: this.moduleBridge,
      lifecycleHooks: this.lifecycleHooks,
      app: this.app
    });

    try {
      await unloadPlugin(ctx, pluginId, assertNoLoadedDependents);
      this.emitEvent({
        pluginId,
        action: "unload",
        success: true,
        durationMs: Date.now() - startedAt,
        stateBefore: record.state,
        stateAfter: "unloaded"
      });
    } catch (error) {
      await persistRecord(this.registry.records, this.runtimeStore, pluginId);
      const failedRecord = this.registry.getRecord(pluginId);
      this.emitEvent({
        pluginId,
        action: "unload",
        phase: failedRecord.lastFailurePhase,
        success: false,
        durationMs: Date.now() - startedAt,
        stateBefore: record.state,
        stateAfter: failedRecord.state,
        details: {
          cause: this.errorToString(error),
          failureCount: failedRecord.failureCount,
          statusReason: failedRecord.statusReason
        }
      });
      throw error;
    }
  }

  async reload(pluginId: string): Promise<void> {
    const record = this.registry.getRecord(pluginId);
    const startedAt = Date.now();
    if (record.state === "disabled") {
      throw new PluginRuntimeError(`Cannot reload disabled plugin "${pluginId}"`, { pluginId });
    }

    if (record.state === "loaded") {
      await this.unload(pluginId);
    }
    await this.load(pluginId);
    this.emitEvent({
      pluginId,
      action: "reload",
      success: true,
      durationMs: Date.now() - startedAt,
      stateBefore: record.state,
      stateAfter: this.registry.getRecord(pluginId).state
    });
  }

  async unregister(pluginId: string): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const record = this.registry.getRecord(pluginId);
    const startedAt = Date.now();

    if (record.state === "loaded") {
      throw new PluginStateTransitionError(
        `Cannot unregister plugin "${pluginId}" while it is loaded`,
        { pluginId, from: record.state, action: "unregister" }
      );
    }

    assertNoRegisteredDependents(pluginId, this.registry.records);
    const definition = this.registry.getDefinition(pluginId);

    try {
      if (this.lifecycleHooks?.onBeforeUnregister) {
        const context = this.createContext(definition.manifest);
        await this.lifecycleHooks.onBeforeUnregister(context);
      }
    } catch (error) {
      throw new PluginRuntimeError(
        `Plugin "${pluginId}" cannot be unregistered because onBeforeUnregister failed`,
        { pluginId, cause: this.errorToString(error) }
      );
    }

    this.registry.removePlugin(pluginId);
    this.loadedContributions.remove(pluginId);
    await this.runtimeStore.remove(pluginId);

    this.emitEvent({
      pluginId,
      action: "unregister",
      success: true,
      durationMs: Date.now() - startedAt,
      stateBefore: record.state,
      stateAfter: undefined
    });
  }

  async loadMany(pluginIds?: readonly string[]): Promise<void> {
    const startedAt = Date.now();
    const targets =
      pluginIds && pluginIds.length > 0
        ? [...pluginIds]
        : this.list()
            .filter((item) => item.state !== "disabled")
            .map((item) => item.manifest.id);

    const ordered = sortPluginsByDependencies(targets, this.registry.records);
    for (const pluginId of ordered) {
      await this.load(pluginId);
    }

    this.emitEvent({
      pluginId: "*",
      action: "load-many",
      success: true,
      durationMs: Date.now() - startedAt,
      details: { targets: ordered }
    });
  }

  async reconcileDiscoveredPlugins(pluginIds: readonly string[]): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const discovered = new Set(pluginIds);

    for (const [pluginId, record] of this.registry.records) {
      if (discovered.has(pluginId)) continue;

      this.registry.records.set(pluginId, {
        ...record,
        state: record.state === "disabled" ? "disabled" : "failed",
        loadedAt: undefined,
        failedAt: record.failedAt ?? new Date(),
        lastFailurePhase: record.lastFailurePhase ?? "register",
        statusReason: {
          code: "plugin_source_missing",
          message:
            "Plugin runtime state was restored but no configured source currently provides it",
          details: { rehydratedState: record.state }
        }
      });
      this.registry.registrationValidator.remove(pluginId);
      this.loadedContributions.remove(pluginId);
      await persistRecord(this.registry.records, this.runtimeStore, pluginId);
    }
  }

  async disable(pluginId: string, reason?: string): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const record = this.registry.getRecord(pluginId);
    const startedAt = Date.now();
    const details = reason ? new Error(reason) : undefined;

    if (record.state === "loaded") {
      try {
        await this.unload(pluginId);
      } catch (error) {
        this.markDisabled(pluginId, reason, error);
        await persistRecord(this.registry.records, this.runtimeStore, pluginId);
        throw new PluginRuntimeError(`Plugin "${pluginId}" disabled but unload produced errors`, {
          pluginId,
          cause: this.errorToString(error),
          reason
        });
      }
    }

    this.markDisabled(pluginId, reason, details);
    await persistRecord(this.registry.records, this.runtimeStore, pluginId);
    this.emitEvent({
      pluginId,
      action: "disable",
      success: true,
      durationMs: Date.now() - startedAt,
      stateBefore: record.state,
      stateAfter: "disabled",
      details: reason ? { reason } : undefined
    });
  }

  async enable(pluginId: string): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const record = this.registry.getRecord(pluginId);
    const startedAt = Date.now();

    if (record.state !== "disabled") {
      throw new PluginStateTransitionError(
        `Cannot enable plugin "${pluginId}" from state "${record.state}"`,
        { pluginId, from: record.state, action: "enable" }
      );
    }

    this.registry.records.set(pluginId, {
      ...record,
      state: "registered",
      disabledAt: undefined,
      disabledReason: undefined,
      statusReason: createPluginStatusReason("registered")
    });
    await persistRecord(this.registry.records, this.runtimeStore, pluginId);
    this.emitEvent({
      pluginId,
      action: "enable",
      success: true,
      durationMs: Date.now() - startedAt,
      stateBefore: record.state,
      stateAfter: "registered"
    });
  }

  list(): readonly PluginRuntimeRecord[] {
    return Array.from(this.registry.records.values()).map((record) => ({
      ...record,
      state: record.state as PluginState
    }));
  }

  events(options?: { pluginId?: string; limit?: number }): readonly PluginRuntimeEvent[] {
    return this.eventsLog.list(options);
  }

  describeDependencies(): PluginDependencyGraphSnapshot {
    return describePluginDependencyGraph(this.registry.records);
  }

  describeContributions(): PluginContributionCatalogSnapshot {
    return this.loadedContributions.snapshot();
  }

  private createContext(manifest: PluginRuntimeRecord["manifest"]): KernelPluginRuntimeContext {
    if (!this.app) {
      throw new PluginRuntimeError(
        `Plugin "${manifest.id}" requires an ApplicationContext to run lifecycle hooks`,
        { pluginId: manifest.id }
      );
    }
    return { app: this.app, pluginId: manifest.id, manifest };
  }

  private markDisabled(pluginId: string, reason?: string, error?: unknown): void {
    const current = this.registry.getRecord(pluginId);
    this.loadedContributions.remove(pluginId);
    this.registry.records.set(pluginId, {
      ...current,
      state: "disabled",
      loadedAt: undefined,
      disabledAt: new Date(),
      disabledReason: reason,
      lastError:
        error instanceof Error
          ? error
          : error
            ? new Error(this.errorToString(error))
            : current.lastError,
      statusReason: createPluginStatusReason("disabled", {
        reason: reason?.trim() || "operator_request"
      })
    });
  }

  private errorToString(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return String(error);
  }

  private emitEvent(event: Omit<PluginRuntimeEvent, "timestamp" | "sequence">): void {
    this.eventsLog.emit(event);
  }

  private resolveAttempts(_state: PluginState): number {
    const retryMax = this.retryPolicy?.maxAttempts ?? 0;
    const normalizedRetry = Number.isFinite(retryMax) ? Math.max(0, Math.floor(retryMax)) : 0;
    return 1 + normalizedRetry;
  }

  private isRetryableLoadError(error: unknown): boolean {
    return error instanceof PluginLifecycleError;
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async ensureRuntimeStoreInitialized(): Promise<void> {
    if (!this.runtimeStoreInitialization) {
      this.runtimeStoreInitialization = this.runtimeStore.initialize();
    }

    await this.runtimeStoreInitialization;
    if (!this.runtimeStoreHydrated) {
      this.runtimeStoreHydrated = true;
      await hydrateFromRuntimeStore(this.registry.records, this.runtimeStore);
    }
  }
}
