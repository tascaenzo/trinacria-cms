import type { ModuleDefinition } from "@trinacria/core";
import type { ApplicationContext } from "@trinacria/core";
import type {
  KernelPluginDefinition,
  KernelPluginRuntimeContext,
  PluginLifecyclePhase,
  PluginRuntimeDiagnostic,
  PluginRuntimeLifecycleHooks,
  PluginRuntimeRecord,
  PluginState
} from "../../contracts/plugin-runtime.js";
import { CoreError } from "../../errors/core-error.js";
import {
  PluginDependencyError,
  PluginLifecycleError,
  PluginRuntimeError
} from "../../errors/plugin-errors.js";
import {
  extractRequiredDependencies,
  assertRequiredDependenciesAvailable
} from "./plugin-runtime-dependencies.js";
import type { PluginContributionRegistry } from "./plugin-runtime-contributions.js";
import { persistRecord } from "./plugin-runtime-persistence.js";
import type { PluginRuntimeStore } from "../../contracts/plugin-runtime-store.js";
import type { TrinacriaModuleBridge } from "../bridge/trinacria-module-bridge.js";
import {
  createPluginStatusReason,
  transitionPluginRecord
} from "./plugin-runtime-state-machine.js";

export interface PluginRuntimeLifecycleContext {
  records: Map<string, PluginRuntimeRecord>;
  definitions: Map<string, KernelPluginDefinition>;
  pluginModules: Map<string, readonly ModuleDefinition[]>;
  moduleBridge?: TrinacriaModuleBridge;
  lifecycleHooks?: PluginRuntimeLifecycleHooks;
  loadedContributions: PluginContributionRegistry;
  app?: ApplicationContext;
  runtimeStore: PluginRuntimeStore;
  emitPluginEvent?: (pluginId: string, eventName: string, payload: unknown) => Promise<void>;
}

export interface LifecycleContextOptions {
  records: Map<string, PluginRuntimeRecord>;
  definitions: Map<string, KernelPluginDefinition>;
  pluginModules: Map<string, readonly ModuleDefinition[]>;
  loadedContributions: PluginContributionRegistry;
  runtimeStore: PluginRuntimeStore;
  moduleBridge?: TrinacriaModuleBridge;
  lifecycleHooks?: PluginRuntimeLifecycleHooks;
  app?: ApplicationContext;
  emitPluginEvent?: (pluginId: string, eventName: string, payload: unknown) => Promise<void>;
}

export function createLifecycleContext(
  options: LifecycleContextOptions
): PluginRuntimeLifecycleContext {
  return {
    records: options.records,
    definitions: options.definitions,
    pluginModules: options.pluginModules,
    loadedContributions: options.loadedContributions,
    runtimeStore: options.runtimeStore,
    moduleBridge: options.moduleBridge,
    lifecycleHooks: options.lifecycleHooks,
    app: options.app,
    emitPluginEvent: options.emitPluginEvent
  };
}

function getRecord(
  records: Map<string, PluginRuntimeRecord>,
  pluginId: string
): PluginRuntimeRecord {
  const record = records.get(pluginId);
  if (!record) {
    throw new PluginRuntimeError(`Plugin "${pluginId}" is not registered`, { pluginId });
  }
  return record;
}

function getDefinition(
  definitions: Map<string, KernelPluginDefinition>,
  pluginId: string
): KernelPluginDefinition {
  const definition = definitions.get(pluginId);
  if (!definition) {
    throw new PluginRuntimeError(`Plugin "${pluginId}" has no definition`, { pluginId });
  }
  return definition;
}

function createContext(
  definition: KernelPluginDefinition,
  app: ApplicationContext | undefined,
  emitPluginEvent: (eventName: string, payload: unknown) => Promise<void>
): KernelPluginRuntimeContext {
  if (!app) {
    throw new PluginRuntimeError(
      `Plugin "${definition.manifest.id}" requires an ApplicationContext to run lifecycle hooks`,
      { pluginId: definition.manifest.id }
    );
  }
  return {
    app,
    pluginId: definition.manifest.id,
    manifest: definition.manifest,
    i18nSources: definition.i18nSources ?? [],
    events: {
      emit: emitPluginEvent
    }
  };
}

function errorToString(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function transitionState(
  records: Map<string, PluginRuntimeRecord>,
  pluginId: string,
  nextState: PluginState
): void {
  records.set(pluginId, transitionPluginRecord(pluginId, getRecord(records, pluginId), nextState));
}

function markFailedState(
  records: Map<string, PluginRuntimeRecord>,
  loadedContributions: PluginContributionRegistry,
  pluginId: string,
  phase: PluginLifecyclePhase,
  error: unknown
): void {
  const current = getRecord(records, pluginId);
  loadedContributions.remove(pluginId);
  records.set(pluginId, {
    ...current,
    state: "failed",
    loadedAt: undefined,
    failedAt: new Date(),
    lastFailurePhase: phase,
    failureCount: (current.failureCount ?? 0) + 1,
    lastError: error instanceof Error ? error : new Error(errorToString(error)),
    statusReason: createPluginStatusReason("failed", {
      phase,
      error: toRuntimeDiagnostic(error)
    })
  });
}

function toRuntimeDiagnostic(error: unknown): PluginRuntimeDiagnostic {
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

function buildLifecycleError(
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
    cause: errorToString(error),
    rollbackErrors: rollbackErrors.map((item) => errorToString(item))
  });
}

export async function loadPluginInternal(
  ctx: PluginRuntimeLifecycleContext,
  pluginId: string,
  stack: Set<string>
): Promise<void> {
  const record = getRecord(ctx.records, pluginId);
  if (record.state === "loaded") return;
  if (record.state === "disabled") {
    throw new PluginRuntimeError(`Plugin "${pluginId}" is disabled`, { pluginId });
  }
  if (stack.has(pluginId)) {
    throw new PluginDependencyError(
      `Circular dependency detected while loading plugin "${pluginId}"`,
      { pluginId, cyclePath: [...stack, pluginId] }
    );
  }
  stack.add(pluginId);

  const definition = getDefinition(ctx.definitions, pluginId);
  const requiredDependencies = extractRequiredDependencies(definition.manifest);

  try {
    assertRequiredDependenciesAvailable(pluginId, requiredDependencies, ctx.records);
  } catch (error) {
    markFailedState(ctx.records, ctx.loadedContributions, pluginId, "dependency-check", error);
    stack.delete(pluginId);
    throw error;
  }

  for (const dependency of requiredDependencies) {
    const dependencyRecord = getRecord(ctx.records, dependency.pluginId);
    if (dependencyRecord.state !== "loaded") {
      await loadPluginInternal(ctx, dependency.pluginId, stack);
    }
  }

  stack.delete(pluginId);

  if ((definition.modules?.length ?? 0) > 0 && !ctx.moduleBridge) {
    const error = new PluginRuntimeError(
      `Plugin "${pluginId}" declares runtime modules but no ApplicationContext is configured`,
      { pluginId }
    );
    markFailedState(ctx.records, ctx.loadedContributions, pluginId, "load", error);
    throw error;
  }

  transitionState(ctx.records, pluginId, "loading");
  const needsRuntimeContext =
    Boolean(definition.onLoad) ||
    Boolean(definition.onInit) ||
    Boolean(definition.onUnload) ||
    Boolean(ctx.lifecycleHooks?.onAfterLoad);
  const context = needsRuntimeContext
    ? createContext(definition, ctx.app, async (eventName, payload) => {
        if (!ctx.emitPluginEvent) {
          throw new PluginRuntimeError(
            `Plugin "${definition.manifest.id}" cannot emit "${eventName}" because the runtime publisher is not available`,
            { pluginId: definition.manifest.id }
          );
        }
        await ctx.emitPluginEvent(definition.manifest.id, eventName, payload);
      })
    : undefined;
  let phase: PluginLifecyclePhase = "load";
  let onLoadCompleted = false;
  let registeredModules: readonly ModuleDefinition[] = [];

  try {
    if (ctx.moduleBridge) {
      registeredModules = await ctx.moduleBridge.registerModules(
        pluginId,
        definition.modules ?? []
      );
    }

    if (definition.onLoad && context) {
      await definition.onLoad(context);
    }
    onLoadCompleted = true;

    transitionState(ctx.records, pluginId, "initializing");
    phase = "init";
    if (definition.onInit && context) {
      await definition.onInit(context);
    }

    if (ctx.lifecycleHooks?.onAfterLoad && context) {
      await ctx.lifecycleHooks.onAfterLoad(context);
    }

    ctx.records.set(pluginId, {
      ...getRecord(ctx.records, pluginId),
      state: "loaded",
      loadedAt: new Date(),
      lastError: undefined,
      lastFailurePhase: undefined,
      failedAt: undefined,
      statusReason: createPluginStatusReason("loaded")
    });
    ctx.pluginModules.set(pluginId, registeredModules);
    ctx.loadedContributions.upsert(definition.manifest);
  } catch (error) {
    const rollbackErrors = await rollbackFailedLoad(
      ctx,
      pluginId,
      definition,
      context,
      registeredModules,
      onLoadCompleted
    );
    markFailedState(ctx.records, ctx.loadedContributions, pluginId, phase, error);
    throw buildLifecycleError(pluginId, phase, error, "load", rollbackErrors);
  }
}

export async function rollbackFailedLoad(
  ctx: PluginRuntimeLifecycleContext,
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

  if (ctx.moduleBridge) {
    const moduleErrors = await ctx.moduleBridge.unregisterModules(pluginId, registeredModules);
    rollbackErrors.push(...moduleErrors);
  }

  return rollbackErrors;
}

export async function unloadPlugin(
  ctx: PluginRuntimeLifecycleContext,
  pluginId: string,
  assertNoLoadedDependentsFn: (pluginId: string, records: Map<string, PluginRuntimeRecord>) => void
): Promise<void> {
  const record = getRecord(ctx.records, pluginId);
  if (record.state === "disabled") return;
  if (record.state !== "loaded" && record.state !== "failed") {
    throw new PluginRuntimeError(
      `Cannot unload plugin "${pluginId}" from state "${record.state}"`,
      { pluginId }
    );
  }

  assertNoLoadedDependentsFn(pluginId, ctx.records);
  if (record.state === "loaded") {
    transitionState(ctx.records, pluginId, "unloading");
  }

  const definition = getDefinition(ctx.definitions, pluginId);
  const needsRuntimeContext = Boolean(definition.onUnload);
  const context = needsRuntimeContext
    ? createContext(definition, ctx.app, async (eventName, payload) => {
        if (!ctx.emitPluginEvent) {
          throw new PluginRuntimeError(
            `Plugin "${pluginId}" cannot emit "${eventName}" because the runtime publisher is not available`,
            { pluginId }
          );
        }
        await ctx.emitPluginEvent(pluginId, eventName, payload);
      })
    : undefined;
  const loadedModules = ctx.pluginModules.get(pluginId) ?? [];

  let phase: PluginLifecyclePhase = "unload";
  try {
    if (record.state === "loaded" && definition.onUnload && context) {
      await definition.onUnload(context);
    }

    if (ctx.moduleBridge) {
      phase = "rollback";
      const errors = await ctx.moduleBridge.unregisterModules(pluginId, loadedModules);
      if (errors.length > 0) {
        throw new PluginLifecycleError(`Module unregistration failed for plugin "${pluginId}"`, {
          pluginId,
          stage: "unload",
          errors: errors.map((item) => errorToString(item))
        });
      }
    }

    ctx.pluginModules.set(pluginId, []);
    ctx.loadedContributions.remove(pluginId);
    transitionState(ctx.records, pluginId, "unloaded");
    await persistRecord(ctx.records, ctx.runtimeStore, pluginId);
  } catch (error) {
    markFailedState(ctx.records, ctx.loadedContributions, pluginId, phase, error);
    await persistRecord(ctx.records, ctx.runtimeStore, pluginId);
    throw buildLifecycleError(pluginId, phase, error, "unload");
  }
}
