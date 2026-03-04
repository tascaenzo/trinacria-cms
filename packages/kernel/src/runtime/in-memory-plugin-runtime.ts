import type {
  PluginDependencyGraphSnapshot,
  KernelPluginDefinition,
  KernelPluginRuntimeContext,
  PluginRuntimeLifecycleHooks,
  PluginRuntimeEvent,
  PluginRuntimeRetryPolicy,
  PluginLifecyclePhase,
  PluginRuntime,
  PluginRuntimeRecord,
  PluginState,
} from "../contracts/plugin-runtime.js";
import type { PluginRuntimeStore } from "../contracts/plugin-runtime-store.js";
import type { PluginManifestDependency } from "../contracts/plugin-manifest.js";
import type { ApplicationContext, ModuleDefinition } from "@trinacria/core";
import {
  PluginCompatibilityError,
  PluginDependencyError,
  PluginLifecycleError,
  PluginManifestError,
  PluginRuntimeError,
  PluginStateTransitionError,
} from "../errors/plugin-errors.js";
import {
  assertPluginCompatibility,
  validatePluginManifest,
} from "./plugin-manifest-validation.js";
import { satisfiesVersion } from "./semver.js";
import {
  TrinacriaModuleBridge,
  type TrinacriaModuleBridgeApp,
} from "./trinacria-module-bridge.js";
import { createInMemoryPluginRuntimeStore } from "./plugin-runtime-store.js";

export interface InMemoryPluginRuntimeOptions {
  coreVersion: string;
  app?: ApplicationContext;
  lifecycleHooks?: PluginRuntimeLifecycleHooks;
  retryPolicy?: PluginRuntimeRetryPolicy;
  onEvent?: (event: PluginRuntimeEvent) => void;
  runtimeStore?: PluginRuntimeStore;
}

const ALLOWED_TRANSITIONS: Readonly<Record<PluginState, readonly PluginState[]>> =
  {
    registered: ["loading", "disabled"],
    loading: ["initializing", "failed"],
    initializing: ["loaded", "failed"],
    loaded: ["unloading", "disabled", "failed"],
    unloading: ["unloaded", "failed", "disabled"],
    failed: ["loading", "disabled", "unloaded"],
    disabled: ["registered"],
    unloaded: ["loading", "disabled", "registered"],
  };

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
  private readonly onEvent?: (event: PluginRuntimeEvent) => void;
  private readonly runtimeStore: PluginRuntimeStore;
  private runtimeStoreInitialization?: Promise<void>;

  constructor(options: InMemoryPluginRuntimeOptions) {
    this.coreVersion = options.coreVersion;
    this.app = options.app;
    this.lifecycleHooks = options.lifecycleHooks;
    this.retryPolicy = options.retryPolicy;
    this.onEvent = options.onEvent;
    this.runtimeStore = options.runtimeStore ?? createInMemoryPluginRuntimeStore();

    if (options.app) {
      this.moduleBridge = new TrinacriaModuleBridge(
        options.app as TrinacriaModuleBridgeApp,
      );
    }
  }

  async register(
    plugin: KernelPluginDefinition | PluginRuntimeRecord["manifest"],
  ): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const startedAt = Date.now();
    let definition: KernelPluginDefinition;
    let manifest: PluginRuntimeRecord["manifest"];

    try {
      definition = this.normalizeDefinition(plugin);
      manifest = validatePluginManifest(definition.manifest);
      assertPluginCompatibility(manifest, this.coreVersion);
      this.assertDependencyGraphWithoutCycles(
        manifest.id,
        this.extractRequiredDependencies(manifest),
      );
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
        cause: this.errorToString(error),
      });
    }

    const existing = this.records.get(manifest.id);
    if (existing && existing.state === "loaded") {
      throw new PluginStateTransitionError(
        `Cannot register plugin "${manifest.id}" while it is loaded`,
        { pluginId: manifest.id, from: existing.state, action: "register" },
      );
    }

    if (existing?.state === "disabled") {
      this.definitions.set(manifest.id, {
        ...definition,
        manifest,
      });
      this.records.set(manifest.id, {
        ...existing,
        manifest,
      });
      await this.persistRecord(manifest.id);
      this.emitEvent({
        pluginId: manifest.id,
        action: "register",
        success: true,
        durationMs: Date.now() - startedAt,
        stateBefore: existing.state,
        stateAfter: existing.state,
        message: "Plugin metadata updated while disabled",
      });
      return;
    }

    this.definitions.set(manifest.id, {
      ...definition,
      manifest,
    });
    this.records.set(manifest.id, {
      manifest,
      state: "registered",
      lastError: undefined,
      lastFailurePhase: undefined,
      failedAt: undefined,
      disabledAt: undefined,
      disabledReason: undefined,
    });
    await this.persistRecord(manifest.id);
    this.emitEvent({
      pluginId: manifest.id,
      action: "register",
      success: true,
      durationMs: Date.now() - startedAt,
      stateBefore: existing?.state,
      stateAfter: "registered",
    });
  }

  async load(pluginId: string): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const record = this.getRecord(pluginId);
    const startedAt = Date.now();
    if (this.activeLoads.has(pluginId)) {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is already loading`, {
        pluginId,
      });
    }
    if (record.state === "disabled") {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is disabled`, {
        pluginId,
      });
    }
    if (record.state === "loaded") return;
    if (!["registered", "unloaded", "failed"].includes(record.state)) {
      throw new PluginStateTransitionError(
        `Cannot load plugin "${pluginId}" from state "${record.state}"`,
        { pluginId, from: record.state, action: "load" },
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
            details: { attempts: attempt },
          });
          return;
        } catch (error) {
          await this.persistRecord(pluginId);
          lastError = error;
          const shouldRetry =
            attempt < attempts && this.isRetryableLoadError(error);
          this.emitEvent({
            pluginId,
            action: "load",
            phase: shouldRetry ? "load" : undefined,
            success: false,
            durationMs: Date.now() - startedAt,
            stateBefore: record.state,
            stateAfter: this.getRecord(pluginId).state,
            details: {
              attempt,
              attempts,
              retrying: shouldRetry,
              cause: this.errorToString(error),
            },
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
    if (record.state === "disabled") return;
    if (record.state !== "loaded") {
      throw new PluginStateTransitionError(
        `Cannot unload plugin "${pluginId}" from state "${record.state}"`,
        { pluginId, from: record.state, action: "unload" },
      );
    }

    this.assertNoLoadedDependents(pluginId);
    this.transition(pluginId, "unloading");

    const definition = this.getDefinition(pluginId);
    const needsRuntimeContext = Boolean(definition.onUnload);
    const context = needsRuntimeContext
      ? this.createContext(definition.manifest)
      : undefined;
    const loadedModules = this.pluginModules.get(pluginId) ?? [];

    let phase: PluginLifecyclePhase = "unload";
    try {
      if (definition.onUnload && context) {
        await definition.onUnload(context);
      }

      if (this.moduleBridge) {
        phase = "rollback";
        const errors = await this.moduleBridge.unregisterModules(
          pluginId,
          loadedModules,
        );
        if (errors.length > 0) {
          throw new PluginLifecycleError(
            `Module unregistration failed for plugin "${pluginId}"`,
            {
              pluginId,
              stage: "unload",
              errors: errors.map((error) => this.errorToString(error)),
            },
          );
        }
      }

      this.pluginModules.set(pluginId, []);
      this.transition(pluginId, "unloaded");
      await this.persistRecord(pluginId);
    } catch (error) {
      this.markFailed(pluginId, phase, error);
      await this.persistRecord(pluginId);
      throw this.toLifecycleError(pluginId, phase, error, "unload");
    }
  }

  async reload(pluginId: string): Promise<void> {
    const record = this.getRecord(pluginId);
    const startedAt = Date.now();
    if (record.state === "disabled") {
      throw new PluginRuntimeError(
        `Cannot reload disabled plugin "${pluginId}"`,
        { pluginId },
      );
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
      stateAfter: this.getRecord(pluginId).state,
    });
  }

  async unregister(pluginId: string): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const record = this.getRecord(pluginId);
    const startedAt = Date.now();

    if (record.state === "loaded") {
      throw new PluginStateTransitionError(
        `Cannot unregister plugin "${pluginId}" while it is loaded`,
        { pluginId, from: record.state, action: "unregister" },
      );
    }

    this.assertNoRegisteredDependents(pluginId);
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
          cause: this.errorToString(error),
        },
      );
    }

    this.records.delete(pluginId);
    this.definitions.delete(pluginId);
    this.pluginModules.delete(pluginId);
    await this.runtimeStore.remove(pluginId);

    this.emitEvent({
      pluginId,
      action: "unregister",
      success: true,
      durationMs: Date.now() - startedAt,
      stateBefore: record.state,
      stateAfter: undefined,
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

    const ordered = this.sortByDependencies(targets);
    for (const pluginId of ordered) {
      await this.load(pluginId);
    }

    this.emitEvent({
      pluginId: "*",
      action: "load-many",
      success: true,
      durationMs: Date.now() - startedAt,
      details: { targets: ordered },
    });
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
        throw new PluginRuntimeError(
          `Plugin "${pluginId}" disabled but unload produced errors`,
          {
            pluginId,
            cause: this.errorToString(error),
            reason,
          },
        );
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
      details: reason ? { reason } : undefined,
    });
  }

  list(): readonly PluginRuntimeRecord[] {
    return Array.from(this.records.values()).map((record) => ({
      ...record,
      state: record.state as PluginState,
    }));
  }

  describeDependencies(): PluginDependencyGraphSnapshot {
    const nodes = this.list().map((item) => ({
      pluginId: item.manifest.id,
      state: item.state,
      version: item.manifest.version,
    }));
    const edges: PluginDependencyGraphSnapshot["edges"] = [];
    const warnings: string[] = [];

    for (const record of this.records.values()) {
      const dependencies = record.manifest.dependencies ?? [];
      for (const dependency of dependencies) {
        const target = this.records.get(dependency.pluginId);
        const versionOk = target
          ? satisfiesVersion(target.manifest.version, dependency.versionRange)
          : false;
        const status = !target
          ? "missing"
          : target.state === "disabled"
            ? "disabled"
            : !versionOk
              ? "version-mismatch"
              : "ok";

        edges.push({
          from: record.manifest.id,
          to: dependency.pluginId,
          optional: Boolean(dependency.optional),
          requiredRange: dependency.versionRange,
          status,
          currentVersion: target?.manifest.version,
        });

        if (dependency.optional && status !== "ok") {
          warnings.push(
            `Optional dependency "${dependency.pluginId}" for plugin "${record.manifest.id}" is ${status}`,
          );
        }
      }
    }

    return {
      nodes,
      edges,
      warnings,
    };
  }

  private async loadInternal(pluginId: string, stack: Set<string>): Promise<void> {
    const record = this.getRecord(pluginId);
    if (record.state === "loaded") return;
    if (record.state === "disabled") {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is disabled`, {
        pluginId,
      });
    }
    if (stack.has(pluginId)) {
      throw new PluginDependencyError(
        `Circular dependency detected while loading plugin "${pluginId}"`,
        {
          pluginId,
          cyclePath: [...stack, pluginId],
        },
      );
    }
    stack.add(pluginId);

    const definition = this.getDefinition(pluginId);
    const requiredDependencies = this.extractRequiredDependencies(
      definition.manifest,
    );

    try {
      this.assertRequiredDependenciesAvailable(pluginId, requiredDependencies);
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
        { pluginId },
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
    const context = needsRuntimeContext
      ? this.createContext(definition.manifest)
      : undefined;
    let phase: PluginLifecyclePhase = "load";
    let onLoadCompleted = false;
    let registeredModules: readonly ModuleDefinition[] = [];

    try {
      if (this.moduleBridge) {
        registeredModules = await this.moduleBridge.registerModules(
          pluginId,
          definition.modules ?? [],
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
      });
      this.pluginModules.set(pluginId, registeredModules);
    } catch (error) {
      const rollbackErrors = await this.rollbackFailedLoad(
        pluginId,
        definition,
        context,
        registeredModules,
        onLoadCompleted,
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
    onLoadCompleted: boolean,
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
      const moduleErrors = await this.moduleBridge.unregisterModules(
        pluginId,
        registeredModules,
      );
      rollbackErrors.push(...moduleErrors);
    }

    return rollbackErrors;
  }

  private normalizeDefinition(
    plugin: KernelPluginDefinition | PluginRuntimeRecord["manifest"],
  ): KernelPluginDefinition {
    if ("manifest" in plugin) {
      return {
        ...plugin,
        modules: plugin.modules ?? [],
      };
    }

    return {
      manifest: plugin,
      modules: [],
    };
  }

  private createContext(manifest: PluginRuntimeRecord["manifest"]): KernelPluginRuntimeContext {
    if (!this.app) {
      throw new PluginRuntimeError(
        `Plugin "${manifest.id}" requires an ApplicationContext to run lifecycle hooks`,
        { pluginId: manifest.id },
      );
    }

    return {
      app: this.app,
      pluginId: manifest.id,
      manifest,
    };
  }

  private getDefinition(pluginId: string): KernelPluginDefinition {
    const definition = this.definitions.get(pluginId);
    if (!definition) {
      throw new PluginRuntimeError(`Plugin "${pluginId}" has no definition`, {
        pluginId,
      });
    }
    return definition;
  }

  private getRecord(pluginId: string): PluginRuntimeRecord {
    const record = this.records.get(pluginId);
    if (!record) {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is not registered`, {
        pluginId,
      });
    }
    return record;
  }

  private transition(pluginId: string, nextState: PluginState): void {
    const current = this.getRecord(pluginId);
    const allowed = ALLOWED_TRANSITIONS[current.state] ?? [];
    if (!allowed.includes(nextState)) {
      throw new PluginStateTransitionError(
        `Invalid transition for plugin "${pluginId}": "${current.state}" -> "${nextState}"`,
        {
          pluginId,
          from: current.state,
          to: nextState,
        },
      );
    }

    this.records.set(pluginId, {
      ...current,
      state: nextState,
      ...(nextState !== "loaded" ? { loadedAt: undefined } : {}),
    });
  }

  private markFailed(
    pluginId: string,
    phase: PluginLifecyclePhase,
    error: unknown,
  ): void {
    const current = this.getRecord(pluginId);
    this.records.set(pluginId, {
      ...current,
      state: "failed",
      loadedAt: undefined,
      failedAt: new Date(),
      lastFailurePhase: phase,
      failureCount: (current.failureCount ?? 0) + 1,
      lastError:
        error instanceof Error ? error : new Error(this.errorToString(error)),
    });
  }

  private markDisabled(pluginId: string, reason?: string, error?: unknown): void {
    const current = this.getRecord(pluginId);
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
    });
  }

  private extractRequiredDependencies(
    manifest: PluginRuntimeRecord["manifest"],
  ): readonly PluginManifestDependency[] {
    return (manifest.dependencies ?? []).filter((dependency) => !dependency.optional);
  }

  private assertRequiredDependenciesAvailable(
    pluginId: string,
    dependencies: readonly PluginManifestDependency[],
  ): void {
    for (const dependency of dependencies) {
      const dependencyRecord = this.records.get(dependency.pluginId);
      if (!dependencyRecord) {
        throw new PluginDependencyError(
          `Plugin "${pluginId}" is missing required dependency "${dependency.pluginId}"`,
          {
            pluginId,
            dependencyId: dependency.pluginId,
            requiredRange: dependency.versionRange,
          },
        );
      }
      if (!satisfiesVersion(dependencyRecord.manifest.version, dependency.versionRange)) {
        throw new PluginDependencyError(
          `Plugin "${pluginId}" requires dependency "${dependency.pluginId}" version "${dependency.versionRange}" but found "${dependencyRecord.manifest.version}"`,
          {
            pluginId,
            dependencyId: dependency.pluginId,
            requiredRange: dependency.versionRange,
            currentVersion: dependencyRecord.manifest.version,
          },
        );
      }
      if (dependencyRecord.state === "disabled") {
        throw new PluginDependencyError(
          `Plugin "${pluginId}" depends on disabled plugin "${dependency.pluginId}"`,
          {
            pluginId,
            dependencyId: dependency.pluginId,
          },
        );
      }
    }
  }

  private assertNoLoadedDependents(pluginId: string): void {
    const loadedDependents: string[] = [];

    for (const [candidatePluginId, record] of this.records) {
      if (candidatePluginId === pluginId) continue;
      if (record.state !== "loaded") continue;
      const dependencies = this.extractRequiredDependencies(record.manifest);
      if (dependencies.some((dependency) => dependency.pluginId === pluginId)) {
        loadedDependents.push(candidatePluginId);
      }
    }

    if (loadedDependents.length > 0) {
      throw new PluginDependencyError(
        `Cannot unload plugin "${pluginId}" while loaded dependents exist`,
        {
          pluginId,
          loadedDependents,
        },
      );
    }
  }

  private assertNoRegisteredDependents(pluginId: string): void {
    const registeredDependents: string[] = [];

    for (const [candidatePluginId, record] of this.records) {
      if (candidatePluginId === pluginId) continue;
      const dependencies = this.extractRequiredDependencies(record.manifest);
      if (dependencies.some((dependency) => dependency.pluginId === pluginId)) {
        registeredDependents.push(candidatePluginId);
      }
    }

    if (registeredDependents.length > 0) {
      throw new PluginDependencyError(
        `Cannot unregister plugin "${pluginId}" while registered dependents exist`,
        {
          pluginId,
          registeredDependents,
        },
      );
    }
  }

  private assertDependencyGraphWithoutCycles(
    registeringPluginId: string,
    registeringDependencies: readonly PluginManifestDependency[],
  ): void {
    const graph = new Map<string, readonly string[]>();

    for (const [pluginId, record] of this.records) {
      graph.set(
        pluginId,
        this.extractRequiredDependencies(record.manifest).map((dep) => dep.pluginId),
      );
    }

    graph.set(
      registeringPluginId,
      registeringDependencies.map((dependency) => dependency.pluginId),
    );

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (node: string, path: readonly string[]): void => {
      if (visited.has(node)) return;
      if (visiting.has(node)) {
        const cycleStartIndex = path.indexOf(node);
        const cyclePath = [...path.slice(cycleStartIndex), node];
        throw new PluginDependencyError(
          `Circular dependency detected: ${cyclePath.join(" -> ")}`,
          {
            cyclePath,
          },
        );
      }

      visiting.add(node);
      const edges = graph.get(node) ?? [];
      for (const edge of edges) {
        if (!graph.has(edge)) continue;
        visit(edge, [...path, edge]);
      }
      visiting.delete(node);
      visited.add(node);
    };

    for (const node of graph.keys()) {
      visit(node, [node]);
    }
  }

  private toLifecycleError(
    pluginId: string,
    phase: PluginLifecyclePhase,
    error: unknown,
    action: "load" | "unload",
    rollbackErrors: readonly unknown[] = [],
  ): PluginLifecycleError {
    return new PluginLifecycleError(
      `Plugin "${pluginId}" failed during ${action} (${phase})`,
      {
        pluginId,
        phase,
        action,
        cause: this.errorToString(error),
        rollbackErrors: rollbackErrors.map((item) => this.errorToString(item)),
      },
    );
  }

  private errorToString(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return String(error);
  }

  private emitEvent(
    event: Omit<PluginRuntimeEvent, "timestamp">,
  ): void {
    this.onEvent?.({
      ...event,
      timestamp: new Date(),
    });
  }

  private resolveAttempts(_state: PluginState): number {
    const retryMax = this.retryPolicy?.maxAttempts ?? 0;
    const normalizedRetry = Number.isFinite(retryMax)
      ? Math.max(0, Math.floor(retryMax))
      : 0;
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
  }

  private async persistRecord(pluginId: string): Promise<void> {
    const record = this.records.get(pluginId);
    if (!record) return;
    await this.runtimeStore.upsert(record);
  }

  private sortByDependencies(pluginIds: readonly string[]): string[] {
    const targetSet = new Set(pluginIds);
    const ordered: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (pluginId: string) => {
      if (visited.has(pluginId)) return;
      if (visiting.has(pluginId)) {
        throw new PluginDependencyError(
          `Circular dependency detected while sorting plugin "${pluginId}"`,
          { pluginId },
        );
      }

      const record = this.records.get(pluginId);
      if (!record) {
        throw new PluginDependencyError(
          `Plugin "${pluginId}" is not registered and cannot be loaded`,
          { pluginId },
        );
      }

      visiting.add(pluginId);
      for (const dep of this.extractRequiredDependencies(record.manifest)) {
        if (!this.records.has(dep.pluginId)) {
          throw new PluginDependencyError(
            `Plugin "${pluginId}" is missing required dependency "${dep.pluginId}"`,
            { pluginId, dependencyId: dep.pluginId },
          );
        }
        visit(dep.pluginId);
      }
      visiting.delete(pluginId);
      visited.add(pluginId);

      if (targetSet.has(pluginId)) {
        ordered.push(pluginId);
      }
    };

    for (const pluginId of targetSet) {
      visit(pluginId);
    }

    return ordered;
  }
}
