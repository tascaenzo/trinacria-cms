import { randomUUID } from "node:crypto";
import type {
  PluginClusterOperation,
  PluginClusterOperationInput,
  PluginClusterSnapshot
} from "../../contracts/plugin-cluster.js";
import type { PluginSourceSnapshot } from "../../contracts/plugin-discovery.js";
import type { PluginManifest, PluginManifestAdmin } from "../../contracts/plugin-manifest.js";
import type {
  PluginContributionCatalogSnapshot,
  PluginDependencyGraphSnapshot,
  PluginRuntime,
  PluginRuntimeDiagnostic,
  PluginRuntimeEvent,
  PluginRuntimeOperation,
  PluginRuntimeOperationAvailability,
  PluginRuntimeRecord,
  PluginState
} from "../../contracts/plugin-runtime.js";
import { CoreError } from "../../errors/core-error.js";
import {
  PluginDependencyError,
  PluginRuntimeError,
  PluginStateTransitionError
} from "../../errors/plugin-errors.js";
import type { PluginClusterCoordinator } from "../cluster/plugin-cluster.js";
import {
  describeAvailableOperations,
  toRuntimeDiagnostic
} from "../plugin-runtime/plugin-runtime-operations.js";

export interface KernelInstalledPluginDependencySnapshot {
  pluginId: string;
  versionRange: string;
  optional: boolean;
  status: PluginDependencyGraphSnapshot["edges"][number]["status"];
  currentVersion?: string;
  state?: PluginState;
  reason?: string;
}

export interface KernelInstalledPluginSnapshot {
  cluster?: PluginClusterSnapshot;
  executionMode: "local" | "cluster";
  operationRevision: number;
  id: string;
  version: string;
  requiresCore: string;
  state: PluginState;
  source?: PluginSourceSnapshot;
  capabilities: readonly string[];
  dependencies: readonly KernelInstalledPluginDependencySnapshot[];
  security: {
    permissions: number;
    roles: number;
    grants: number;
    policyRules: number;
  };
  failureCount: number;
  failedAt?: string;
  lastFailurePhase?: PluginRuntimeRecord["lastFailurePhase"];
  disabledAt?: string;
  disabledReason?: string;
  loadedAt?: string;
  statusReason?: PluginRuntimeRecord["statusReason"];
  lastError?: PluginRuntimeDiagnostic;
  operations: readonly PluginRuntimeOperationAvailability[];
}

export interface KernelCapabilitySnapshot {
  pluginId: string;
  capability: string;
  version: string;
  state: PluginState;
}

export type KernelPluginOperationRequest = PluginClusterOperationInput;
export type KernelPluginOperationResult = PluginClusterOperation;

export interface KernelPluginEventSnapshot {
  sequence: number;
  timestamp: string;
  pluginId: string;
  action: PluginRuntimeEvent["action"];
  success: boolean;
  phase?: PluginRuntimeEvent["phase"];
  message?: string;
  durationMs?: number;
  stateBefore?: PluginRuntimeEvent["stateBefore"];
  stateAfter?: PluginRuntimeEvent["stateAfter"];
  details?: PluginRuntimeEvent["details"];
}

export interface KernelAdminExtensionManifestSnapshot {
  pluginId: string;
  displayName: string;
  admin: PluginManifestAdmin;
}

export interface KernelSystemServiceOptions {
  coordinator?: () => Promise<PluginClusterCoordinator | null>;
  pluginSources?: () => readonly PluginSourceSnapshot[];
}

export class KernelSystemService {
  private localOperationRunning = false;
  private readonly localOperations = new Map<
    string,
    {
      signature: string;
      result: KernelPluginOperationResult;
      completion: Promise<KernelPluginOperationResult>;
    }
  >();
  constructor(
    private readonly runtime: Pick<
      PluginRuntime,
      | "list"
      | "describeDependencies"
      | "load"
      | "unload"
      | "reload"
      | "disable"
      | "enable"
      | "events"
      | "describeContributions"
    >,
    private readonly options: KernelSystemServiceOptions = {}
  ) {}

  async listInstalledPlugins(): Promise<readonly KernelInstalledPluginSnapshot[]> {
    const records = this.runtime.list();
    const dependencies = this.runtime.describeDependencies();
    const cluster = await this.options.coordinator?.();
    return Promise.all(
      records.map(async (record) => {
        const snapshot = cluster ? await cluster.snapshot(record.manifest.id) : undefined;
        return {
          ...this.toPluginSnapshot(record, dependencies),
          executionMode: cluster ? ("cluster" as const) : ("local" as const),
          operationRevision: snapshot?.desired.revision ?? this.localRevision(record.manifest.id),
          ...(snapshot ? { cluster: snapshot } : {})
        };
      })
    );
  }

  listCapabilities(): readonly KernelCapabilitySnapshot[] {
    return this.runtime
      .list()
      .flatMap((record) => this.toCapabilitySnapshots(record.manifest, record.state));
  }

  listPluginContributions(): PluginContributionCatalogSnapshot {
    return this.runtime.describeContributions();
  }

  listAdminExtensions(): readonly KernelAdminExtensionManifestSnapshot[] {
    return this.runtime
      .list()
      .filter((record) => record.state === "loaded" && record.manifest.admin)
      .map((record) => ({
        pluginId: record.manifest.id,
        displayName: record.manifest.displayName ?? formatPluginDisplayName(record.manifest.id),
        admin: record.manifest.admin as PluginManifestAdmin
      }));
  }

  listPluginSources(): readonly PluginSourceSnapshot[] {
    return this.options.pluginSources?.() ?? [];
  }

  async getInstalledPlugin(pluginId: string): Promise<KernelInstalledPluginSnapshot | null> {
    return (await this.listInstalledPlugins()).find((record) => record.id === pluginId) ?? null;
  }
  async executeOperation(
    pluginId: string,
    input: KernelPluginOperationRequest,
    actorId: string
  ): Promise<KernelPluginOperationResult> {
    input = structuredClone(input);
    const coordinator = await this.options.coordinator?.();
    if (coordinator) return coordinator.submit(pluginId, input, actorId);
    this.pruneLocalOperations();
    const key = JSON.stringify([actorId, input.idempotencyKey]);
    const signature = JSON.stringify([
      pluginId,
      input.operation,
      input.expectedRevision,
      input.reason
    ]);
    const previous = this.localOperations.get(key);
    if (previous) {
      if (previous.signature !== signature)
        throw new PluginStateTransitionError("Idempotency key already used for another command");
      return structuredClone(await previous.completion);
    }
    if (this.localOperationRunning)
      throw new PluginStateTransitionError("A local plugin lifecycle operation is already running");
    const snapshot = this.runtime.list().find((record) => record.manifest.id === pluginId);
    if (!snapshot) throw new CoreError("not_found", "Plugin not found");
    if (input.expectedRevision !== this.localRevision(pluginId))
      throw new PluginStateTransitionError("Plugin state changed; refresh before retrying");
    const availability = describeAvailableOperations(
      snapshot,
      this.runtime.describeDependencies()
    ).find((entry) => entry.operation === input.operation);
    if (!availability?.available)
      throw new PluginStateTransitionError(availability?.reason ?? "Invalid plugin operation");
    if (this.localOperations.size >= 1000)
      this.localOperations.delete(this.localOperations.keys().next().value!);
    const result: KernelPluginOperationResult = {
      operationId: randomUUID(),
      pluginId,
      operation: input.operation,
      desiredRevision: this.localRevision(pluginId),
      status: "pending",
      submittedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      participants: ["local"],
      instances: []
    };
    this.localOperationRunning = true;
    const completion = Promise.resolve().then(async () => {
      try {
        if (input.operation === "disable")
          await this.runtime.disable(pluginId, input.reason ?? `Disabled by ${actorId}`);
        else await this.runtime[input.operation](pluginId);
        result.status = "succeeded";
        return result;
      } catch (error) {
        result.status = "failed";
        throw error;
      } finally {
        result.desiredRevision = this.localRevision(pluginId);
        this.localOperationRunning = false;
      }
    });
    this.localOperations.set(key, { signature, result, completion });
    return structuredClone(await completion);
  }
  async getPluginOperation(operationId: string): Promise<KernelPluginOperationResult> {
    const coordinator = await this.options.coordinator?.();
    if (coordinator) return coordinator.status(operationId);
    this.pruneLocalOperations();
    const operation = [...this.localOperations.values()].find(
      (entry) => entry.result.operationId === operationId
    );
    if (!operation) throw new CoreError("not_found", "Plugin operation not found or expired");
    return structuredClone(operation.result);
  }

  private localRevision(pluginId: string): number {
    const revision = this.runtime
      .list()
      .find((record) => record.manifest.id === pluginId)?.lifecycleRevision;
    if (revision !== undefined) return revision;
    return Math.max(
      1,
      ...this.runtime.events({ pluginId, limit: 1 }).map((event) => event.sequence)
    );
  }
  private pruneLocalOperations(): void {
    for (const [key, entry] of this.localOperations)
      if (entry.result.status !== "pending" && Date.parse(entry.result.expiresAt) <= Date.now())
        this.localOperations.delete(key);
  }

  listPluginEvents(pluginId: string, limit = 20): readonly KernelPluginEventSnapshot[] {
    return this.runtime.events({ pluginId, limit }).map((event) => ({
      ...event,
      timestamp: event.timestamp.toISOString()
    }));
  }

  private toPluginSnapshot(
    record: PluginRuntimeRecord,
    dependencyGraph: PluginDependencyGraphSnapshot
  ): KernelInstalledPluginSnapshot {
    const dependencyEdges = dependencyGraph.edges.filter(
      (edge) => edge.from === record.manifest.id
    );
    const source = this.findPluginSource(record.manifest.id);

    return {
      id: record.manifest.id,
      executionMode: "local",
      operationRevision: this.localRevision(record.manifest.id),
      version: record.manifest.version,
      requiresCore: record.manifest.requiresCore,
      state: record.state,
      ...(source ? { source } : {}),
      capabilities: [...(record.manifest.capabilities ?? [])],
      dependencies: (record.manifest.dependencies ?? []).map((dependency) => {
        const edge = dependencyEdges.find((item) => item.to === dependency.pluginId);
        const target = dependencyGraph.nodes.find((item) => item.pluginId === dependency.pluginId);

        return {
          pluginId: dependency.pluginId,
          versionRange: dependency.versionRange,
          optional: dependency.optional ?? false,
          status: edge?.status ?? "missing",
          ...(edge?.currentVersion ? { currentVersion: edge.currentVersion } : {}),
          ...(target?.state ? { state: target.state } : {}),
          ...(edge && edge.status !== "ok"
            ? { reason: describeDependencyIssue(record.manifest.id, edge) }
            : {})
        };
      }),
      security: {
        permissions: record.manifest.security?.permissions?.length ?? 0,
        roles: record.manifest.security?.roles?.length ?? 0,
        grants: record.manifest.security?.grants?.length ?? 0,
        policyRules: record.manifest.security?.policyRules?.length ?? 0
      },
      failureCount: record.failureCount ?? 0,
      ...(record.failedAt ? { failedAt: record.failedAt.toISOString() } : {}),
      ...(record.lastFailurePhase ? { lastFailurePhase: record.lastFailurePhase } : {}),
      ...(record.disabledAt ? { disabledAt: record.disabledAt.toISOString() } : {}),
      ...(record.disabledReason ? { disabledReason: record.disabledReason } : {}),
      ...(record.loadedAt ? { loadedAt: record.loadedAt.toISOString() } : {}),
      ...(record.statusReason ? { statusReason: record.statusReason } : {}),
      ...(record.lastError ? { lastError: toRuntimeDiagnostic(record.lastError) } : {}),
      operations: describeAvailableOperations(record, dependencyGraph)
    };
  }

  private findPluginSource(pluginId: string): PluginSourceSnapshot | undefined {
    return this.listPluginSources().find((source) => source.pluginId === pluginId);
  }

  private toCapabilitySnapshots(
    manifest: PluginManifest,
    state: PluginState
  ): readonly KernelCapabilitySnapshot[] {
    return (manifest.capabilities ?? []).map((capability) => ({
      pluginId: manifest.id,
      capability,
      version: manifest.version,
      state
    }));
  }
}

function formatPluginDisplayName(pluginId: string): string {
  return pluginId
    .split(/[-_:]+/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function describeDependencyIssue(
  pluginId: string,
  edge: PluginDependencyGraphSnapshot["edges"][number]
): string {
  const label = edge.optional ? "Optional dependency" : "Required dependency";
  switch (edge.status) {
    case "missing":
      return `${label} "${edge.to}" is not registered for plugin "${pluginId}"`;
    case "disabled":
      return `Dependency "${edge.to}" is disabled`;
    case "version-mismatch":
      return `Dependency "${edge.to}" does not satisfy required range "${edge.requiredRange}"`;
    default:
      return `Dependency "${edge.to}" is not operational`;
  }
}
