import type { PluginManifestDependency } from "../../contracts/plugin-manifest.js";
import type {
  PluginDependencyGraphSnapshot,
  PluginRuntimeRecord
} from "../../contracts/plugin-runtime.js";
import { PluginDependencyError } from "../../errors/plugin-errors.js";
import { satisfiesVersion } from "../plugin-manifest/semver.js";

export function extractRequiredDependencies(
  manifest: PluginRuntimeRecord["manifest"]
): readonly PluginManifestDependency[] {
  return (manifest.dependencies ?? []).filter((dependency) => !dependency.optional);
}

export function describePluginDependencyGraph(
  records: ReadonlyMap<string, PluginRuntimeRecord>
): PluginDependencyGraphSnapshot {
  const nodes = Array.from(records.values()).map((item) => ({
    pluginId: item.manifest.id,
    state: item.state,
    version: item.manifest.version
  }));
  const edges: PluginDependencyGraphSnapshot["edges"] = [];
  const warnings: string[] = [];

  for (const record of records.values()) {
    const dependencies = record.manifest.dependencies ?? [];
    for (const dependency of dependencies) {
      const target = records.get(dependency.pluginId);
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
        currentVersion: target?.manifest.version
      });

      if (dependency.optional && status !== "ok") {
        warnings.push(
          `Optional dependency "${dependency.pluginId}" for plugin "${record.manifest.id}" is ${status}`
        );
      }
    }
  }

  return {
    nodes,
    edges,
    warnings
  };
}

export function assertRequiredDependenciesAvailable(
  pluginId: string,
  dependencies: readonly PluginManifestDependency[],
  records: ReadonlyMap<string, PluginRuntimeRecord>
): void {
  for (const dependency of dependencies) {
    const dependencyRecord = records.get(dependency.pluginId);
    if (!dependencyRecord) {
      throw new PluginDependencyError(
        `Plugin "${pluginId}" is missing required dependency "${dependency.pluginId}"`,
        {
          pluginId,
          dependencyId: dependency.pluginId,
          requiredRange: dependency.versionRange
        }
      );
    }
    assertDependencyRecordCanSatisfy(pluginId, dependency, dependencyRecord);
  }
}

export function assertNoLoadedDependents(
  pluginId: string,
  records: ReadonlyMap<string, PluginRuntimeRecord>
): void {
  const loadedDependents: string[] = [];

  for (const [candidatePluginId, record] of records) {
    if (candidatePluginId === pluginId) continue;
    if (record.state !== "loaded") continue;
    const dependencies = extractRequiredDependencies(record.manifest);
    if (dependencies.some((dependency) => dependency.pluginId === pluginId)) {
      loadedDependents.push(candidatePluginId);
    }
  }

  if (loadedDependents.length > 0) {
    throw new PluginDependencyError(
      `Cannot unload plugin "${pluginId}" while loaded dependents exist`,
      {
        pluginId,
        loadedDependents
      }
    );
  }
}

export function assertNoRegisteredDependents(
  pluginId: string,
  records: ReadonlyMap<string, PluginRuntimeRecord>
): void {
  const registeredDependents: string[] = [];

  for (const [candidatePluginId, record] of records) {
    if (candidatePluginId === pluginId) continue;
    const dependencies = extractRequiredDependencies(record.manifest);
    if (dependencies.some((dependency) => dependency.pluginId === pluginId)) {
      registeredDependents.push(candidatePluginId);
    }
  }

  if (registeredDependents.length > 0) {
    throw new PluginDependencyError(
      `Cannot unregister plugin "${pluginId}" while registered dependents exist`,
      {
        pluginId,
        registeredDependents
      }
    );
  }
}

export function assertDependencyGraphWithoutCycles(
  registeringPluginId: string,
  registeringDependencies: readonly PluginManifestDependency[],
  records: ReadonlyMap<string, PluginRuntimeRecord>
): void {
  const graph = new Map<string, readonly string[]>();

  for (const [pluginId, record] of records) {
    graph.set(
      pluginId,
      extractRequiredDependencies(record.manifest).map((dep) => dep.pluginId)
    );
  }

  graph.set(
    registeringPluginId,
    registeringDependencies.map((dependency) => dependency.pluginId)
  );

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (node: string, path: readonly string[]): void => {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      const cycleStartIndex = path.indexOf(node);
      const cyclePath = [...path.slice(cycleStartIndex), node];
      throw new PluginDependencyError(`Circular dependency detected: ${cyclePath.join(" -> ")}`, {
        cyclePath
      });
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

export function sortPluginsByDependencies(
  pluginIds: readonly string[],
  records: ReadonlyMap<string, PluginRuntimeRecord>
): string[] {
  const targetSet = new Set(pluginIds);
  const ordered: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (pluginId: string) => {
    if (visited.has(pluginId)) return;
    if (visiting.has(pluginId)) {
      throw new PluginDependencyError(
        `Circular dependency detected while sorting plugin "${pluginId}"`,
        { pluginId }
      );
    }

    const record = records.get(pluginId);
    if (!record) {
      throw new PluginDependencyError(
        `Plugin "${pluginId}" is not registered and cannot be loaded`,
        { pluginId }
      );
    }

    visiting.add(pluginId);
    for (const dep of extractRequiredDependencies(record.manifest)) {
      const dependencyRecord = records.get(dep.pluginId);
      if (!dependencyRecord) {
        throw new PluginDependencyError(
          `Plugin "${pluginId}" is missing required dependency "${dep.pluginId}"`,
          { pluginId, dependencyId: dep.pluginId }
        );
      }
      assertDependencyRecordCanSatisfy(pluginId, dep, dependencyRecord);
      visit(dep.pluginId);
    }
    visiting.delete(pluginId);
    visited.add(pluginId);

    ordered.push(pluginId);
  };

  for (const pluginId of targetSet) {
    visit(pluginId);
  }

  return ordered;
}

function assertDependencyRecordCanSatisfy(
  pluginId: string,
  dependency: PluginManifestDependency,
  dependencyRecord: PluginRuntimeRecord
): void {
  if (!satisfiesVersion(dependencyRecord.manifest.version, dependency.versionRange)) {
    throw new PluginDependencyError(
      `Plugin "${pluginId}" requires dependency "${dependency.pluginId}" version "${dependency.versionRange}" but found "${dependencyRecord.manifest.version}"`,
      {
        pluginId,
        dependencyId: dependency.pluginId,
        requiredRange: dependency.versionRange,
        currentVersion: dependencyRecord.manifest.version
      }
    );
  }
  if (dependencyRecord.state === "disabled") {
    throw new PluginDependencyError(
      `Plugin "${pluginId}" depends on disabled plugin "${dependency.pluginId}"`,
      {
        pluginId,
        dependencyId: dependency.pluginId
      }
    );
  }
}
