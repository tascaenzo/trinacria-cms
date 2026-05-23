import type {
  PluginDependencyGraphSnapshot,
  KernelPluginDefinition,
  KernelPluginRuntimeContext,
  PluginRuntimeDiagnostic,
  PluginRuntimeLifecycleHooks,
  PluginContributionCatalogSnapshot,
  PluginRuntimeEvent,
  PluginRuntimeRetryPolicy,
  PluginLifecyclePhase,
  PluginRuntime,
  PluginRuntimeRecord,
  PluginState
} from "../contracts/plugin-runtime.js";
import type { PluginRuntimeStore } from "../contracts/plugin-runtime-store.js";
import type { ApplicationContext, ModuleDefinition } from "@trinacria/core";
import { CoreError } from "../errors/core-error.js";
import {
  PluginCompatibilityError,
  PluginDependencyError,
  PluginLifecycleError,
  PluginManifestError,
  PluginRuntimeError,
  PluginStateTransitionError
} from "../errors/plugin-errors.js";
import { assertPluginCompatibility, validatePluginManifest } from "./plugin-manifest-validation.js";
import { TrinacriaModuleBridge, type TrinacriaModuleBridgeApp } from "./trinacria-module-bridge.js";
import { createInMemoryPluginRuntimeStore } from "./plugin-runtime-store.js";
import { PluginContributionRegistry } from "./plugin-contribution-registry.js";
import { createNamespaceValidator } from "./plugin-namespace.js";
import {
  assertDependencyGraphWithoutCycles,
  assertNoLoadedDependents,
  assertNoRegisteredDependents,
  assertRequiredDependenciesAvailable,
  describePluginDependencyGraph,
  extractRequiredDependencies,
  sortPluginsByDependencies
} from "./plugin-runtime-dependencies.js";
import { PluginRuntimeEventLog } from "./plugin-runtime-events.js";
import { fromPersistedRuntimeRecord } from "./plugin-runtime-rehydration.js";
import {
  createPluginStatusReason,
  transitionPluginRecord
} from "./plugin-runtime-state-machine.js";

export interface InMemoryPluginRuntimeOptions {
  coreVersion: string;
  app?: ApplicationContext;
  lifecycleHooks?: PluginRuntimeLifecycleHooks;
  retryPolicy?: PluginRuntimeRetryPolicy;
  onEvent?: (event: PluginRuntimeEvent) => void;
  runtimeStore?: PluginRuntimeStore;
  eventBufferSize?: number;
}

/**
 * In-memory plugin runtime with strict lifecycle transitions,
 * dependency graph checks, rollback support, and optional Trinacria module bridge.
 */
export class InMemoryPluginRuntime implements PluginRuntime {
  private readonly records = new Map<string, PluginRuntimeRecord>();
  private readonly definitions = new Map<string, KernelPluginDefinition>();
  private readonly coreVersion: string;
  private readonly app?: ApplicationContext;
  private readonly moduleBridge?: TrinacriaModuleBridge;
  private readonly lifecycleHooks?: PluginRuntimeLifecycleHooks;
  private readonly pluginModules = new Map<string, readonly ModuleDefinition[]>();
  private readonly activeLoads = new Set<string>();
  private readonly retryPolicy?: PluginRuntimeRetryPolicy;
  private readonly runtimeStore: PluginRuntimeStore;
  private readonly contributionValidator = new PluginContributionRegistry();
  private readonly contributionRegistry = new PluginContributionRegistry();
  private readonly namespaceValidator = createNamespaceValidator();
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
      definition = this.normalizeDefinition(plugin);
      manifest = validatePluginManifest(definition.manifest);
      assertPluginCompatibility(manifest, this.coreVersion);
      assertDependencyGraphWithoutCycles(
        manifest.id,
        extractRequiredDependencies(manifest),
        this.records
      );
      this.assertNamespaceValid(manifest);
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

    const existing = this.records.get(manifest.id);
    if (existing && existing.state === "loaded") {
      throw new PluginStateTransitionError(
        `Cannot register plugin "${manifest.id}" while it is loaded`,
        { pluginId: manifest.id, from: existing.state, action: "register" }
      );
    }

    if (existing?.state === "disabled" || existing?.state === "failed") {
      this.contributionValidator.upsert(manifest);
      this.registerNamespace(manifest);
      this.definitions.set(manifest.id, {
        ...definition,
        manifest
      });
      this.records.set(manifest.id, {
        ...existing,
        manifest
      });
      await this.persistRecord(manifest.id);
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

    this.contributionValidator.upsert(manifest);
    this.registerNamespace(manifest);
    this.definitions.set(manifest.id, {
      ...definition,
      manifest
    });
    this.records.set(manifest.id, {
      manifest,
      state: "registered",
      lastError: undefined,
      lastFailurePhase: undefined,
      failedAt: undefined,
      disabledAt: undefined,
      disabledReason: undefined,
      statusReason: createPluginStatusReason("registered")
    });
    await this.persistRecord(manifest.id);
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
    const record = this.getRecord(pluginId);
    const startedAt = Date.now();
    if (this.activeLoads.has(pluginId)) {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is already loading`, {
        pluginId
      });
    }
    if (record.state === "disabled") {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is disabled`, {
        pluginId
      });
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
          await this.loadInternal(pluginId, new Set<string>());
          await this.persistRecord(pluginId);
          this.emitEvent({
            pluginId,
            action: "load",
            success: true,
            durationMs: Date.now() - startedAt,
            stateBefore: record.state,
            stateAfter: this.getRecord(pluginId).state,
            details: { attempts: attempt }
          });
          return;
        } catch (error) {
          await this.persistRecord(pluginId);
          lastError = error;
          const shouldRetry = attempt < attempts && this.isRetryableLoadError(error);
          const failedRecord = this.getRecord(pluginId);
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
    const record = this.getRecord(pluginId);
    const startedAt = Date.now();
    if (record.state === "disabled") return;
    if (record.state !== "loaded" && record.state !== "failed") {
      throw new PluginStateTransitionError(
        `Cannot unload plugin "${pluginId}" from state "${record.state}"`,
        { pluginId, from: record.state, action: "unload" }
      );
    }

    assertNoLoadedDependents(pluginId, this.records);
    if (record.state === "loaded") {
      this.transition(pluginId, "unloading");
    }

    const definition = this.getDefinition(pluginId);
    const needsRuntimeContext = Boolean(definition.onUnload);
    const context = needsRuntimeContext ? this.createContext(definition.manifest) : undefined;
    const loadedModules = this.pluginModules.get(pluginId) ?? [];

    let phase: PluginLifecyclePhase = "unload";
    try {
      if (record.state === "loaded" && definition.onUnload && context) {
        await definition.onUnload(context);
      }

      if (this.moduleBridge) {
        phase = "rollback";
        const errors = await this.moduleBridge.unregisterModules(pluginId, loadedModules);
        if (errors.length > 0) {
          throw new PluginLifecycleError(`Module unregistration failed for plugin "${pluginId}"`, {
            pluginId,
            stage: "unload",
            errors: errors.map((error) => this.errorToString(error))
          });
        }
      }

      this.pluginModules.set(pluginId, []);
      this.contributionRegistry.remove(pluginId);
      this.transition(pluginId, "unloaded");
      await this.persistRecord(pluginId);
      this.emitEvent({
        pluginId,
        action: "unload",
        success: true,
        durationMs: Date.now() - startedAt,
        stateBefore: record.state,
        stateAfter: "unloaded"
      });
    } catch (error) {
      this.markFailed(pluginId, phase, error);
      await this.persistRecord(pluginId);
      const failedRecord = this.getRecord(pluginId);
      this.emitEvent({
        pluginId,
        action: "unload",
        phase,
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
      throw this.toLifecycleError(pluginId, phase, error, "unload");
    }
  }

  async reload(pluginId: string): Promise<void> {
    const record = this.getRecord(pluginId);
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
      stateAfter: this.getRecord(pluginId).state
    });
  }

  async unregister(pluginId: string): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const record = this.getRecord(pluginId);
    const startedAt = Date.now();

    if (record.state === "loaded") {
      throw new PluginStateTransitionError(
        `Cannot unregister plugin "${pluginId}" while it is loaded`,
        { pluginId, from: record.state, action: "unregister" }
      );
    }

    assertNoRegisteredDependents(pluginId, this.records);
    const definition = this.getDefinition(pluginId);

    try {
      if (this.lifecycleHooks?.onBeforeUnregister) {
        const context = this.createContext(definition.manifest);
        await this.lifecycleHooks.onBeforeUnregister(context);
      }
    } catch (error) {
      throw new PluginRuntimeError(
        `Plugin "${pluginId}" cannot be unregistered because onBeforeUnregister failed`,
        {
          pluginId,
          cause: this.errorToString(error)
        }
      );
    }

    this.records.delete(pluginId);
    this.definitions.delete(pluginId);
    this.pluginModules.delete(pluginId);
    this.contributionValidator.remove(pluginId);
    this.contributionRegistry.remove(pluginId);
    this.namespaceValidator.unregisterPlugin(pluginId);
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

    const ordered = sortPluginsByDependencies(targets, this.records);
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

    for (const [pluginId, record] of this.records) {
      if (discovered.has(pluginId)) continue;

      this.records.set(pluginId, {
        ...record,
        state: record.state === "disabled" ? "disabled" : "failed",
        loadedAt: undefined,
        failedAt: record.failedAt ?? new Date(),
        lastFailurePhase: record.lastFailurePhase ?? "register",
        statusReason: {
          code: "plugin_source_missing",
          message:
            "Plugin runtime state was restored but no configured source currently provides it",
          details: {
            rehydratedState: record.state
          }
        }
      });
      this.contributionRegistry.remove(pluginId);
      await this.persistRecord(pluginId);
    }
  }

  async disable(pluginId: string, reason?: string): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const record = this.getRecord(pluginId);
    const startedAt = Date.now();
    const details = reason ? new Error(reason) : undefined;

    if (record.state === "loaded") {
      try {
        await this.unload(pluginId);
      } catch (error) {
        this.markDisabled(pluginId, reason, error);
        await this.persistRecord(pluginId);
        throw new PluginRuntimeError(`Plugin "${pluginId}" disabled but unload produced errors`, {
          pluginId,
          cause: this.errorToString(error),
          reason
        });
      }
    }

    this.markDisabled(pluginId, reason, details);
    await this.persistRecord(pluginId);
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
    const record = this.getRecord(pluginId);
    const startedAt = Date.now();

    if (record.state !== "disabled") {
      throw new PluginStateTransitionError(
        `Cannot enable plugin "${pluginId}" from state "${record.state}"`,
        { pluginId, from: record.state, action: "enable" }
      );
    }

    this.records.set(pluginId, {
      ...record,
      state: "registered",
      disabledAt: undefined,
      disabledReason: undefined,
      statusReason: createPluginStatusReason("registered")
    });
    await this.persistRecord(pluginId);
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
    return Array.from(this.records.values()).map((record) => ({
      ...record,
      state: record.state as PluginState
    }));
  }

  events(options?: { pluginId?: string; limit?: number }): readonly PluginRuntimeEvent[] {
    return this.eventsLog.list(options);
  }

  describeDependencies(): PluginDependencyGraphSnapshot {
    return describePluginDependencyGraph(this.records);
  }

  describeContributions(): PluginContributionCatalogSnapshot {
    return this.contributionRegistry.snapshot();
  }

  private async loadInternal(pluginId: string, stack: Set<string>): Promise<void> {
    const record = this.getRecord(pluginId);
    if (record.state === "loaded") return;
    if (record.state === "disabled") {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is disabled`, {
        pluginId
      });
    }
    if (stack.has(pluginId)) {
      throw new PluginDependencyError(
        `Circular dependency detected while loading plugin "${pluginId}"`,
        {
          pluginId,
          cyclePath: [...stack, pluginId]
        }
      );
    }
    stack.add(pluginId);

    const definition = this.getDefinition(pluginId);
    const requiredDependencies = extractRequiredDependencies(definition.manifest);

    try {
      assertRequiredDependenciesAvailable(pluginId, requiredDependencies, this.records);
    } catch (error) {
      this.markFailed(pluginId, "dependency-check", error);
      stack.delete(pluginId);
      throw error;
    }

    for (const dependency of requiredDependencies) {
      const dependencyRecord = this.getRecord(dependency.pluginId);
      if (dependencyRecord.state !== "loaded") {
        await this.loadInternal(dependency.pluginId, stack);
      }
    }

    stack.delete(pluginId);

    if ((definition.modules?.length ?? 0) > 0 && !this.moduleBridge) {
      const error = new PluginRuntimeError(
        `Plugin "${pluginId}" declares runtime modules but no ApplicationContext is configured`,
        { pluginId }
      );
      this.markFailed(pluginId, "load", error);
      throw error;
    }

    this.transition(pluginId, "loading");
    const needsRuntimeContext =
      Boolean(definition.onLoad) ||
      Boolean(definition.onInit) ||
      Boolean(definition.onUnload) ||
      Boolean(this.lifecycleHooks?.onAfterLoad);
    const context = needsRuntimeContext ? this.createContext(definition.manifest) : undefined;
    let phase: PluginLifecyclePhase = "load";
    let onLoadCompleted = false;
    let registeredModules: readonly ModuleDefinition[] = [];

    try {
      if (this.moduleBridge) {
        registeredModules = await this.moduleBridge.registerModules(
          pluginId,
          definition.modules ?? []
        );
      }

      if (definition.onLoad && context) {
        await definition.onLoad(context);
      }
      onLoadCompleted = true;

      this.transition(pluginId, "initializing");
      phase = "init";
      if (definition.onInit && context) {
        await definition.onInit(context);
      }

      if (this.lifecycleHooks?.onAfterLoad && context) {
        await this.lifecycleHooks.onAfterLoad(context);
      }

      this.records.set(pluginId, {
        ...this.getRecord(pluginId),
        state: "loaded",
        loadedAt: new Date(),
        lastError: undefined,
        lastFailurePhase: undefined,
        failedAt: undefined,
        statusReason: createPluginStatusReason("loaded")
      });
      this.pluginModules.set(pluginId, registeredModules);
      this.contributionRegistry.upsert(definition.manifest);
    } catch (error) {
      const rollbackErrors = await this.rollbackFailedLoad(
        pluginId,
        definition,
        context,
        registeredModules,
        onLoadCompleted
      );
      this.markFailed(pluginId, phase, error);

      throw this.toLifecycleError(pluginId, phase, error, "load", rollbackErrors);
    }
  }

  private async rollbackFailedLoad(
    pluginId: string,
    definition: KernelPluginDefinition,
    context: KernelPluginRuntimeContext | undefined,
    registeredModules: readonly ModuleDefinition[],
    onLoadCompleted: boolean
  ): Promise<readonly unknown[]> {
    const rollbackErrors: unknown[] = [];

    if (onLoadCompleted && definition.onUnload && context) {
      try {
        await definition.onUnload(context);
      } catch (error) {
        rollbackErrors.push(error);
      }
    }

    if (this.moduleBridge) {
      const moduleErrors = await this.moduleBridge.unregisterModules(pluginId, registeredModules);
      rollbackErrors.push(...moduleErrors);
    }

    return rollbackErrors;
  }

  private normalizeDefinition(
    plugin: KernelPluginDefinition | PluginRuntimeRecord["manifest"]
  ): KernelPluginDefinition {
    if ("manifest" in plugin) {
      return {
        ...plugin,
        modules: plugin.modules ?? []
      };
    }

    return {
      manifest: plugin,
      modules: []
    };
  }

  private createContext(manifest: PluginRuntimeRecord["manifest"]): KernelPluginRuntimeContext {
    if (!this.app) {
      throw new PluginRuntimeError(
        `Plugin "${manifest.id}" requires an ApplicationContext to run lifecycle hooks`,
        { pluginId: manifest.id }
      );
    }

    return {
      app: this.app,
      pluginId: manifest.id,
      manifest
    };
  }

  private assertNamespaceValid(manifest: PluginRuntimeRecord["manifest"]): void {
    const result = this.namespaceValidator.validateManifest(manifest);
    if (!result.valid) {
      throw new PluginManifestError(`Plugin "${manifest.id}" namespace validation failed`, {
        pluginId: manifest.id,
        errors: result.errors
      });
    }
  }

  private registerNamespace(manifest: PluginRuntimeRecord["manifest"]): void {
    const result = this.namespaceValidator.registerPlugin(manifest);
    if (!result.valid) {
      throw new PluginManifestError(`Plugin "${manifest.id}" namespace registration failed`, {
        pluginId: manifest.id,
        errors: result.errors
      });
    }
  }

  private getDefinition(pluginId: string): KernelPluginDefinition {
    const definition = this.definitions.get(pluginId);
    if (!definition) {
      throw new PluginRuntimeError(`Plugin "${pluginId}" has no definition`, {
        pluginId
      });
    }
    return definition;
  }

  private getRecord(pluginId: string): PluginRuntimeRecord {
    const record = this.records.get(pluginId);
    if (!record) {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is not registered`, {
        pluginId
      });
    }
    return record;
  }

  private transition(pluginId: string, nextState: PluginState): void {
    this.records.set(
      pluginId,
      transitionPluginRecord(pluginId, this.getRecord(pluginId), nextState)
    );
  }

  private markFailed(pluginId: string, phase: PluginLifecyclePhase, error: unknown): void {
    const current = this.getRecord(pluginId);
    this.contributionRegistry.remove(pluginId);
    this.records.set(pluginId, {
      ...current,
      state: "failed",
      loadedAt: undefined,
      failedAt: new Date(),
      lastFailurePhase: phase,
      failureCount: (current.failureCount ?? 0) + 1,
      lastError: error instanceof Error ? error : new Error(this.errorToString(error)),
      statusReason: createPluginStatusReason("failed", {
        phase,
        error: this.toDiagnostic(error)
      })
    });
  }

  private markDisabled(pluginId: string, reason?: string, error?: unknown): void {
    const current = this.getRecord(pluginId);
    this.contributionRegistry.remove(pluginId);
    this.records.set(pluginId, {
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

  private toDiagnostic(error: unknown): PluginRuntimeDiagnostic {
    if (error instanceof CoreError) {
      return {
        name: error.name,
        message: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {})
      };
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message
      };
    }

    return {
      name: "UnknownError",
      message: String(error)
    };
  }

  private toLifecycleError(
    pluginId: string,
    phase: PluginLifecyclePhase,
    error: unknown,
    action: "load" | "unload",
    rollbackErrors: readonly unknown[] = []
  ): PluginLifecycleError {
    return new PluginLifecycleError(`Plugin "${pluginId}" failed during ${action} (${phase})`, {
      pluginId,
      phase,
      action,
      cause: this.errorToString(error),
      rollbackErrors: rollbackErrors.map((item) => this.errorToString(item))
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
      await this.hydrateRuntimeStore();
    }
  }

  private async persistRecord(pluginId: string): Promise<void> {
    const record = this.records.get(pluginId);
    if (!record) return;
    await this.runtimeStore.upsert(record);
  }

  private async hydrateRuntimeStore(): Promise<void> {
    const persistedRecords = await this.runtimeStore.list();
    for (const persisted of persistedRecords) {
      if (this.records.has(persisted.pluginId)) continue;
      this.records.set(persisted.pluginId, fromPersistedRuntimeRecord(persisted));
    }
  }
}
