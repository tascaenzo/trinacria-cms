import type {
  PluginDependencyGraphSnapshot,
  PluginRuntimeDiagnostic,
  PluginRuntimeOperation,
  PluginRuntimeOperationAvailability,
  PluginRuntimeRecord
} from "../../contracts/plugin-runtime.js";
import { CoreError } from "../../errors/core-error.js";

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

export function toRuntimeDiagnostic(error: Error): PluginRuntimeDiagnostic {
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
