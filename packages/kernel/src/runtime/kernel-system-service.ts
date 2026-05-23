import type { PluginManifest } from "../contracts/plugin-manifest.js";
import type { PluginSourceSnapshot } from "../contracts/plugin-discovery.js";
import type {
  PluginDependencyGraphSnapshot,
  PluginRuntimeDiagnostic,
  PluginRuntimeEvent,
  PluginRuntimeOperation,
  PluginRuntimeOperationAvailability,
  PluginContributionCatalogSnapshot,
  PluginRuntime,
  PluginRuntimeRecord,
  PluginState
} from "../contracts/plugin-runtime.js";
import { CoreError } from "../errors/core-error.js";
import {
  PluginDependencyError,
  PluginRuntimeError,
  PluginStateTransitionError
} from "../errors/plugin-errors.js";

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

export interface KernelPluginOperationRequest {
  operation: PluginRuntimeOperation;
  reason?: string;
}

export interface KernelPluginOperationResult {
  plugin: KernelInstalledPluginSnapshot;
  operation: PluginRuntimeOperation;
  executedAt: string;
}

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

export interface KernelSystemServiceOptions {
  pluginSources?: () => readonly PluginSourceSnapshot[];
}

/**
 * Read-only system discovery service exposing what the current CMS runtime
 * has actually registered and loaded.
 */
export class KernelSystemService {
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

  listInstalledPlugins(): readonly KernelInstalledPluginSnapshot[] {
    const records = this.runtime.list();
    const dependencies = this.runtime.describeDependencies();
    return records.map((record) => this.toPluginSnapshot(record, dependencies));
  }

  listCapabilities(): readonly KernelCapabilitySnapshot[] {
    return this.runtime
      .list()
      .flatMap((record) => this.toCapabilitySnapshots(record.manifest, record.state));
  }

  listPluginContributions(): PluginContributionCatalogSnapshot {
    return this.runtime.describeContributions();
  }

  listPluginSources(): readonly PluginSourceSnapshot[] {
    return this.options.pluginSources?.() ?? [];
  }

  getInstalledPlugin(pluginId: string): KernelInstalledPluginSnapshot | null {
    return this.listInstalledPlugins().find((record) => record.id === pluginId) ?? null;
  }

  async executeOperation(
    pluginId: string,
    input: KernelPluginOperationRequest
  ): Promise<KernelPluginOperationResult> {
    const snapshot = this.getInstalledPlugin(pluginId);
    if (!snapshot) {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is not registered`, {
        pluginId
      });
    }

    const availability = snapshot.operations.find((item) => item.operation === input.operation);
    if (!availability?.available) {
      throw new PluginStateTransitionError(
        availability?.reason ??
          `Operation "${input.operation}" is not available for plugin "${pluginId}"`,
        {
          pluginId,
          operation: input.operation,
          state: snapshot.state
        }
      );
    }

    switch (input.operation) {
      case "load":
        await this.runtime.load(pluginId);
        break;
      case "unload":
        await this.runtime.unload(pluginId);
        break;
      case "reload":
        await this.runtime.reload(pluginId);
        break;
      case "disable":
        await this.runtime.disable(pluginId, input.reason);
        break;
      case "enable":
        await this.runtime.enable(pluginId);
        break;
      default:
        throw new CoreError(
          "KERNEL_PLUGIN_OPERATION_UNSUPPORTED",
          `Unsupported plugin operation "${input.operation}"`,
          {
            details: {
              pluginId,
              operation: input.operation
            }
          }
        );
    }

    const updated = this.getInstalledPlugin(pluginId);
    if (!updated) {
      throw new PluginDependencyError(
        `Plugin "${pluginId}" became unavailable after "${input.operation}"`,
        {
          pluginId,
          operation: input.operation
        }
      );
    }

    return {
      plugin: updated,
      operation: input.operation,
      executedAt: new Date().toISOString()
    };
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

export function describeAvailableOperations(
  record: PluginRuntimeRecord,
  dependencyGraph?: PluginDependencyGraphSnapshot
): readonly PluginRuntimeOperationAvailability[] {
  const blockingDependency = dependencyGraph
    ? findBlockingRequiredDependency(record.manifest.id, dependencyGraph)
    : undefined;
  const loadedDependents = dependencyGraph
    ? findLoadedRequiredDependents(record.manifest.id, dependencyGraph)
    : [];
  const sourceMissing = record.statusReason?.code === "plugin_source_missing";
  const hasLoadedDependents = loadedDependents.length > 0;
  const dependencyBlockReason = blockingDependency
    ? describeDependencyIssue(record.manifest.id, blockingDependency)
    : undefined;
  const dependentBlockReason = hasLoadedDependents
    ? `Plugin has loaded required dependents: ${loadedDependents.join(", ")}`
    : undefined;
  const sourceMissingReason = sourceMissing
    ? "Plugin cannot be operated because no configured source currently provides it"
    : undefined;

  return [
    availability(
      "load",
      ["registered", "unloaded", "failed"].includes(record.state) &&
        !blockingDependency &&
        !sourceMissing,
      {
        disabledReason: "Disabled plugins must be enabled before load",
        defaultReason:
          sourceMissingReason ??
          dependencyBlockReason ??
          `Plugin cannot be loaded from state "${record.state}"`,
        record
      }
    ),
    availability("unload", ["loaded", "failed"].includes(record.state) && !hasLoadedDependents, {
      defaultReason:
        dependentBlockReason ??
        `Only loaded or failed plugins can be unloaded; current state is "${record.state}"`,
      record
    }),
    availability(
      "reload",
      ["registered", "unloaded", "failed", "loaded"].includes(record.state) &&
        !blockingDependency &&
        !sourceMissing,
      {
        disabledReason: "Disabled plugins must be enabled before reload",
        defaultReason:
          sourceMissingReason ??
          dependencyBlockReason ??
          `Plugin cannot be reloaded from state "${record.state}"`,
        record
      }
    ),
    availability(
      "disable",
      ["registered", "loaded", "unloading", "failed", "unloaded"].includes(record.state) &&
        !(record.state === "loaded" && hasLoadedDependents),
      {
        defaultReason:
          dependentBlockReason ??
          (record.state === "disabled"
            ? 'Plugin is already in state "disabled"'
            : `Plugin cannot be disabled from transient state "${record.state}"`),
        record
      }
    ),
    availability("enable", record.state === "disabled", {
      defaultReason: `Only disabled plugins can be enabled; current state is "${record.state}"`,
      record
    })
  ];
}

function availability(
  operation: PluginRuntimeOperation,
  available: boolean,
  options: {
    defaultReason: string;
    disabledReason?: string;
    record: PluginRuntimeRecord;
  }
): PluginRuntimeOperationAvailability {
  if (available) {
    return { operation, available: true };
  }

  if (options.record.state === "disabled" && operation !== "enable" && options.disabledReason) {
    return {
      operation,
      available: false,
      reason: options.disabledReason
    };
  }

  return {
    operation,
    available: false,
    reason: options.defaultReason
  };
}

function toRuntimeDiagnostic(error: Error): PluginRuntimeDiagnostic {
  if (error instanceof CoreError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      ...(error.details ? { details: error.details } : {})
    };
  }

  return {
    name: error.name,
    message: error.message
  };
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

function findBlockingRequiredDependency(
  pluginId: string,
  dependencyGraph: PluginDependencyGraphSnapshot
): PluginDependencyGraphSnapshot["edges"][number] | undefined {
  return dependencyGraph.edges.find(
    (edge) =>
      edge.from === pluginId &&
      !edge.optional &&
      ["missing", "disabled", "version-mismatch"].includes(edge.status)
  );
}

function findLoadedRequiredDependents(
  pluginId: string,
  dependencyGraph: PluginDependencyGraphSnapshot
): string[] {
  return dependencyGraph.edges
    .filter((edge) => edge.to === pluginId && !edge.optional)
    .filter((edge) =>
      dependencyGraph.nodes.some((node) => node.pluginId === edge.from && node.state === "loaded")
    )
    .map((edge) => edge.from);
}
