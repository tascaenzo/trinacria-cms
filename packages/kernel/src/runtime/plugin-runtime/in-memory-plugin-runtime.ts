import type {
  PluginDependencyGraphSnapshot,
  KernelPluginDefinition,
  KernelPluginRuntimeContext,
  PluginRuntimeLifecycleHooks,
  PluginContributionCatalogSnapshot,
  PluginRuntimeEvent,
  PluginRuntimeRetryPolicy,
  PluginEventSubscriptionAuthorizer,
  PluginRuntime,
  PluginRuntimeRecord,
  PluginState
} from "../../contracts/plugin-runtime.js";
import type { PluginManifestEmittedEvent } from "../../contracts/plugin-manifest.js";
import type { PluginRuntimeStore } from "../../contracts/plugin-runtime-store.js";
import type { ApplicationContext } from "@trinacria/core";
import { EVENT_BUS_TOKEN, type EventBus, type EventEnvelope } from "@trinacria/events";
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
import { isPermissionOwnedByPlugin } from "../plugin-namespace/permission-key.js";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";

export { type PluginRuntimeLifecycleHooks, type TrinacriaModuleBridge };

export interface InMemoryPluginRuntimeOptions {
  coreVersion: string;
  app?: ApplicationContext;
  lifecycleHooks?: PluginRuntimeLifecycleHooks;
  retryPolicy?: PluginRuntimeRetryPolicy;
  onEvent?: (event: PluginRuntimeEvent) => void;
  runtimeStore?: PluginRuntimeStore;
  eventBufferSize?: number;
  eventSubscriptionAuthorizer?: PluginEventSubscriptionAuthorizer;
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
  private readonly eventSubscriptionAuthorizer?: PluginEventSubscriptionAuthorizer;
  private readonly pluginEventSubscriptions = new Map<string, readonly (() => void)[]>();
  private runtimeStoreInitialization?: Promise<void>;
  private runtimeStoreHydrated = false;

  constructor(options: InMemoryPluginRuntimeOptions) {
    this.coreVersion = options.coreVersion;
    this.app = options.app;
    this.lifecycleHooks = options.lifecycleHooks;
    this.retryPolicy = options.retryPolicy;
    this.eventSubscriptionAuthorizer = options.eventSubscriptionAuthorizer;
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
            app: this.app,
            emitPluginEvent: (sourcePluginId, eventName, payload) =>
              this.emitPluginEvent(sourcePluginId, eventName, payload)
          });
          await this.assertPluginEventSubscriptionsReady(pluginId);
          await loadPluginInternal(ctx, pluginId, new Set<string>());
          await this.bindPluginEventSubscriptions(pluginId);
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
      app: this.app,
      emitPluginEvent: (sourcePluginId, eventName, payload) =>
        this.emitPluginEvent(sourcePluginId, eventName, payload)
    });

    try {
      this.unbindPluginEventSubscriptions(pluginId);
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
        const context = this.createContext(definition);
        await this.lifecycleHooks.onBeforeUnregister(context);
      }
    } catch (error) {
      throw new PluginRuntimeError(
        `Plugin "${pluginId}" cannot be unregistered because onBeforeUnregister failed`,
        { pluginId, cause: this.errorToString(error) }
      );
    }

    this.registry.removePlugin(pluginId);
    this.unbindPluginEventSubscriptions(pluginId);
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

  async emitPluginEvent(pluginId: string, eventName: string, payload: unknown): Promise<void> {
    await this.ensureRuntimeStoreInitialized();
    const record = this.registry.getRecord(pluginId);
    if (record.state !== "loaded") {
      throw new PluginRuntimeError(
        `Plugin "${pluginId}" cannot emit events while ${record.state}`,
        {
          pluginId
        }
      );
    }

    const event = resolveDeclaredEmittedEvent(
      record.manifest.id,
      record.manifest.events?.emits,
      eventName
    );
    validateEventPayload(event, payload);

    const bus = await this.resolveEventBus();
    if (!bus) {
      throw new PluginRuntimeError(
        `Plugin "${pluginId}" cannot emit "${eventName}" because event bus is not available`,
        { pluginId }
      );
    }

    await bus.emit(buildCanonicalEventName(record.manifest.id, event.name), payload);
  }

  describeDependencies(): PluginDependencyGraphSnapshot {
    return describePluginDependencyGraph(this.registry.records);
  }

  describeContributions(): PluginContributionCatalogSnapshot {
    return this.loadedContributions.snapshot();
  }

  private createContext(definition: KernelPluginDefinition): KernelPluginRuntimeContext {
    if (!this.app) {
      throw new PluginRuntimeError(
        `Plugin "${definition.manifest.id}" requires an ApplicationContext to run lifecycle hooks`,
        { pluginId: definition.manifest.id }
      );
    }
    return {
      app: this.app,
      pluginId: definition.manifest.id,
      manifest: definition.manifest,
      i18nSources: definition.i18nSources ?? [],
      events: {
        emit: (eventName, payload) => this.emitPluginEvent(definition.manifest.id, eventName, payload)
      }
    };
  }

  private markDisabled(pluginId: string, reason?: string, error?: unknown): void {
    const current = this.registry.getRecord(pluginId);
    this.loadedContributions.remove(pluginId);
    this.unbindPluginEventSubscriptions(pluginId);
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

  private async bindPluginEventSubscriptions(pluginId: string): Promise<void> {
    this.unbindPluginEventSubscriptions(pluginId);
    const definition = this.registry.getDefinition(pluginId);
    const subscribedEvents = definition.manifest.events?.subscribes ?? [];
    if (subscribedEvents.length === 0) return;

    const bus = await this.resolveEventBus();
    if (!bus) {
      throw new PluginRuntimeError(
        `Plugin "${pluginId}" declares event subscriptions but event bus is not available`,
        { pluginId }
      );
    }

    const eventHandlers = definition.eventHandlers ?? {};
    const unsubs: Array<() => void> = [];

    for (const subscription of subscribedEvents) {
      const eventNames = this.resolveSubscriptionEventNames(subscription.eventName);
      for (const eventName of eventNames) {
        await this.assertSubscriptionAllowed(pluginId, eventName, subscription.requiredPermission);
      }
      const runtimeHandler = eventHandlers[subscription.handler];
      if (!runtimeHandler) {
        throw new PluginRuntimeError(
          `Plugin "${pluginId}" is missing runtime handler "${subscription.handler}" for event "${subscription.eventName}"`,
          { pluginId }
        );
      }

      for (const eventName of eventNames) {
        const off = bus.on(eventName, async (payload, envelope) => {
          if (!this.app) {
            throw new PluginRuntimeError(
              `Plugin "${pluginId}" cannot handle event "${eventName}" without an ApplicationContext`,
              { pluginId }
            );
          }
          await runtimeHandler(payload, envelope as EventEnvelope, {
            app: this.app,
            pluginId,
            eventName,
            handlerName: subscription.handler
          });
        });
        unsubs.push(off);
      }
    }

    this.pluginEventSubscriptions.set(pluginId, unsubs);
  }

  private async assertPluginEventSubscriptionsReady(pluginId: string): Promise<void> {
    const definition = this.registry.getDefinition(pluginId);
    const subscribedEvents = definition.manifest.events?.subscribes ?? [];
    if (subscribedEvents.length === 0) return;

    const bus = await this.resolveEventBus();
    if (!bus) {
      throw new PluginRuntimeError(
        `Plugin "${pluginId}" declares event subscriptions but event bus is not available`,
        { pluginId }
      );
    }

    const eventHandlers = definition.eventHandlers ?? {};
    for (const subscription of subscribedEvents) {
      const eventNames = this.resolveSubscriptionEventNames(subscription.eventName);
      for (const eventName of eventNames) {
        await this.assertSubscriptionAllowed(pluginId, eventName, subscription.requiredPermission);
      }
      if (!eventHandlers[subscription.handler]) {
        throw new PluginRuntimeError(
          `Plugin "${pluginId}" is missing runtime handler "${subscription.handler}" for event "${subscription.eventName}"`,
          { pluginId }
        );
      }
    }
  }

  private unbindPluginEventSubscriptions(pluginId: string): void {
    const unsubs = this.pluginEventSubscriptions.get(pluginId);
    if (!unsubs || unsubs.length === 0) return;
    for (const off of unsubs) {
      try {
        off();
      } catch {
        // Ignore subscriber teardown issues during runtime state transitions.
      }
    }
    this.pluginEventSubscriptions.delete(pluginId);
  }

  private async resolveEventBus(): Promise<EventBus | null> {
    if (!this.app) return null;
    if (!("hasToken" in this.app) || typeof this.app.hasToken !== "function") {
      return null;
    }
    if (!this.app.hasToken(EVENT_BUS_TOKEN)) {
      return null;
    }
    return this.app.resolve<EventBus>(EVENT_BUS_TOKEN);
  }

  private async assertSubscriptionAllowed(
    subscriberPluginId: string,
    eventName: string,
    requiredPermission?: string
  ): Promise<void> {
    const event = this.resolveRegisteredEmittedEvent(eventName);
    const ownerPluginId = readEventOwnerPluginId(eventName);
    if (event.visibility === "private" && ownerPluginId !== subscriberPluginId) {
      throw new PluginRuntimeError(
        `Plugin "${subscriberPluginId}" cannot subscribe to private event "${eventName}"`,
        { pluginId: subscriberPluginId }
      );
    }
    if ((event.visibility === "protected" || event.visibility === "audit") && !requiredPermission) {
      throw new PluginRuntimeError(
        `Plugin "${subscriberPluginId}" must declare requiredPermission to subscribe to ${event.visibility} event "${eventName}"`,
        { pluginId: subscriberPluginId }
      );
    }
    if (event.visibility !== "protected" && event.visibility !== "audit") {
      return;
    }
    const permission = requiredPermission?.trim().toLowerCase();
    if (!permission || !isPermissionOwnedByPlugin(ownerPluginId, permission)) {
      throw new PluginRuntimeError(
        `Plugin "${subscriberPluginId}" must use an event-owner permission to subscribe to ${event.visibility} event "${eventName}"`,
        { pluginId: subscriberPluginId }
      );
    }
    if (!this.isPermissionDeclaredByPlugin(ownerPluginId, permission)) {
      throw new PluginRuntimeError(
        `Plugin "${subscriberPluginId}" references undeclared permission "${permission}" for event "${eventName}"`,
        { pluginId: subscriberPluginId }
      );
    }
    const authorizer = await this.resolveEventSubscriptionAuthorizer();
    if (!authorizer) {
      return;
    }
    const decision = await authorizer.canSubscribe({
      subscriberPluginId,
      eventName,
      eventOwnerPluginId: ownerPluginId,
      eventVisibility: event.visibility,
      requiredPermission: permission
    });
    if (!decision.allowed) {
      throw new PluginRuntimeError(
        `Plugin "${subscriberPluginId}" is not authorized to subscribe to event "${eventName}"`,
        { pluginId: subscriberPluginId, reason: decision.reason }
      );
    }
  }

  private async resolveEventSubscriptionAuthorizer(): Promise<PluginEventSubscriptionAuthorizer | null> {
    if (this.eventSubscriptionAuthorizer) {
      return this.eventSubscriptionAuthorizer;
    }
    if (!this.app?.hasToken?.(CORE_TOKENS.PLUGIN_EVENT_SUBSCRIPTION_AUTHORIZER)) {
      return null;
    }
    return this.app.resolve<PluginEventSubscriptionAuthorizer>(
      CORE_TOKENS.PLUGIN_EVENT_SUBSCRIPTION_AUTHORIZER
    );
  }

  private resolveRegisteredEmittedEvent(eventName: string): PluginManifestEmittedEvent {
    const ownerPluginId = readEventOwnerPluginId(eventName);
    const owner = this.registry.records.get(ownerPluginId);
    const event = owner?.manifest.events?.emits?.find(
      (item) => buildCanonicalEventName(ownerPluginId, item.name) === eventName.trim().toLowerCase()
    );
    if (!event) {
      throw new PluginRuntimeError(
        `Subscribed event "${eventName}" is not declared by any registered plugin`,
        {
          pluginId: ownerPluginId
        }
      );
    }
    return event;
  }

  private resolveSubscriptionEventNames(eventName: string): readonly string[] {
    const normalized = eventName.trim().toLowerCase();
    if (!normalized.startsWith("*:")) {
      return [normalized];
    }

    const localName = normalized.slice(2);
    const matches: string[] = [];
    for (const record of this.registry.records.values()) {
      for (const event of record.manifest.events?.emits ?? []) {
        if (event.name.trim().toLowerCase() === localName) {
          matches.push(buildCanonicalEventName(record.manifest.id, event.name));
        }
      }
    }

    if (matches.length === 0) {
      throw new PluginRuntimeError(
        `Wildcard subscription "${eventName}" does not match any registered emitted event`
      );
    }
    return matches;
  }

  private resolveAttempts(_state: PluginState): number {
    const retryMax = this.retryPolicy?.maxAttempts ?? 0;
    const normalizedRetry = Number.isFinite(retryMax) ? Math.max(0, Math.floor(retryMax)) : 0;
    return 1 + normalizedRetry;
  }

  private isPermissionDeclaredByPlugin(pluginId: string, permissionKey: string): boolean {
    const owner = this.registry.records.get(pluginId);
    return Boolean(
      owner?.manifest.security?.permissions?.some(
        (permission) => permission.key.trim().toLowerCase() === permissionKey
      )
    );
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

function resolveDeclaredEmittedEvent(
  pluginId: string,
  events: readonly PluginManifestEmittedEvent[] | undefined,
  eventName: string
): PluginManifestEmittedEvent {
  const normalizedEventName = eventName.trim().toLowerCase();
  const localName = normalizedEventName.startsWith(`${pluginId}:`)
    ? normalizedEventName.slice(pluginId.length + 1)
    : normalizedEventName;
  const event = (events ?? []).find((item) => item.name.trim().toLowerCase() === localName);
  if (!event) {
    throw new PluginRuntimeError(
      `Plugin "${pluginId}" cannot emit undeclared event "${eventName}"`,
      { pluginId }
    );
  }
  return event;
}

function buildCanonicalEventName(pluginId: string, eventName: string): string {
  return `${pluginId.trim().toLowerCase()}:${eventName.trim().toLowerCase()}`;
}

function readEventOwnerPluginId(eventName: string): string {
  const [ownerPluginId] = eventName.trim().toLowerCase().split(":");
  if (!ownerPluginId) {
    throw new PluginRuntimeError(`Invalid event name "${eventName}"`);
  }
  return ownerPluginId;
}

function validateEventPayload(event: PluginManifestEmittedEvent, payload: unknown): void {
  if (!event.payloadSchema) return;
  const result = validateJsonSchemaPayload(event.payloadSchema, payload);
  if (result.valid) return;
  throw new PluginRuntimeError(`Payload for event "${event.name}" does not match payloadSchema`, {
    details: { reason: result.reason }
  });
}

function validateJsonSchemaPayload(
  schema: Record<string, unknown>,
  value: unknown
): { valid: true } | { valid: false; reason: string } {
  const type = schema.type;
  if (typeof type === "string") {
    const typeResult = validateJsonSchemaType(type, value);
    if (!typeResult.valid) return typeResult;
  }

  if (schema.enum !== undefined) {
    if (!Array.isArray(schema.enum)) {
      return { valid: false, reason: "schema enum must be an array" };
    }
    if (!schema.enum.includes(value)) {
      return { valid: false, reason: "value is not in enum" };
    }
  }

  if (type === "object" || schema.properties || schema.required) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { valid: false, reason: "value must be an object" };
    }
    const record = value as Record<string, unknown>;
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (typeof key === "string" && !(key in record)) {
        return { valid: false, reason: `missing required property "${key}"` };
      }
    }

    const properties = schema.properties;
    if (properties && typeof properties === "object" && !Array.isArray(properties)) {
      for (const [key, propertySchema] of Object.entries(properties)) {
        if (!(key in record) || !propertySchema || typeof propertySchema !== "object") continue;
        const result = validateJsonSchemaPayload(
          propertySchema as Record<string, unknown>,
          record[key]
        );
        if (!result.valid) {
          return { valid: false, reason: `${key}: ${result.reason}` };
        }
      }
    }
  }

  return { valid: true };
}

function validateJsonSchemaType(
  type: string,
  value: unknown
): { valid: true } | { valid: false; reason: string } {
  if (type === "object") {
    return value && typeof value === "object" && !Array.isArray(value)
      ? { valid: true }
      : { valid: false, reason: "value must be an object" };
  }
  if (type === "array") {
    return Array.isArray(value)
      ? { valid: true }
      : { valid: false, reason: "value must be an array" };
  }
  if (type === "string") {
    return typeof value === "string"
      ? { valid: true }
      : { valid: false, reason: "value must be a string" };
  }
  if (type === "number" || type === "integer") {
    return typeof value === "number" &&
      Number.isFinite(value) &&
      (type !== "integer" || Number.isInteger(value))
      ? { valid: true }
      : { valid: false, reason: `value must be a ${type}` };
  }
  if (type === "boolean") {
    return typeof value === "boolean"
      ? { valid: true }
      : { valid: false, reason: "value must be a boolean" };
  }
  if (type === "null") {
    return value === null ? { valid: true } : { valid: false, reason: "value must be null" };
  }
  return { valid: true };
}
