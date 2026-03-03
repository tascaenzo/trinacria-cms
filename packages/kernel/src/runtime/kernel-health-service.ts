import type { DbAdapter } from "../contracts/db-adapter.js";
import type {
  PluginDependencyGraphSnapshot,
  PluginRuntime,
  PluginRuntimeRecord,
  PluginState,
} from "../contracts/plugin-runtime.js";

export interface KernelHealthServiceOptions {
  runtime: Pick<PluginRuntime, "list" | "describeDependencies">;
  dbAdapter?: Pick<DbAdapter, "healthCheck">;
  dbHealthCheck?: () => Promise<{ ok: true } | { ok: false; reason: string }>;
}

export interface KernelRuntimeHealthSummary {
  totalPlugins: number;
  byState: Record<PluginState, number>;
}

export interface KernelHealthSnapshot {
  timestamp: Date;
  status: "ok" | "degraded" | "down";
  runtime: KernelRuntimeHealthSummary;
  dependencies: PluginDependencyGraphSnapshot;
  db: { ok: true } | { ok: false; reason: string } | { ok: false; reason: "not_configured" };
  issues: string[];
}

/**
 * Aggregates kernel runtime and persistence health into a single snapshot.
 */
export class KernelHealthService {
  constructor(private readonly options: KernelHealthServiceOptions) {}

  async snapshot(): Promise<KernelHealthSnapshot> {
    const records = this.options.runtime.list();
    const dependencies = this.options.runtime.describeDependencies();

    const runtimeSummary = this.buildRuntimeSummary(records);
    const db = this.options.dbAdapter
      ? await this.options.dbAdapter.healthCheck()
      : this.options.dbHealthCheck
        ? await this.options.dbHealthCheck()
        : ({ ok: false, reason: "not_configured" } as const);

    const issues = this.collectIssues(records, dependencies, db);
    const status = this.deriveStatus(records, dependencies, db);

    return {
      timestamp: new Date(),
      status,
      runtime: runtimeSummary,
      dependencies,
      db,
      issues,
    };
  }

  private buildRuntimeSummary(
    records: readonly PluginRuntimeRecord[],
  ): KernelRuntimeHealthSummary {
    const base: Record<PluginState, number> = {
      registered: 0,
      loading: 0,
      initializing: 0,
      loaded: 0,
      unloading: 0,
      failed: 0,
      disabled: 0,
      unloaded: 0,
    };

    for (const record of records) {
      base[record.state] += 1;
    }

    return {
      totalPlugins: records.length,
      byState: base,
    };
  }

  private deriveStatus(
    records: readonly PluginRuntimeRecord[],
    dependencies: PluginDependencyGraphSnapshot,
    db: { ok: true } | { ok: false; reason: string },
  ): "ok" | "degraded" | "down" {
    if (!db.ok && db.reason !== "not_configured") return "down";

    const hasRuntimeDegradation = records.some((record) =>
      ["failed", "disabled", "loading", "initializing", "unloading"].includes(
        record.state,
      ),
    );

    const hasRequiredDependencyIssue = dependencies.edges.some(
      (edge) => !edge.optional && edge.status !== "ok",
    );

    if (hasRuntimeDegradation || hasRequiredDependencyIssue) {
      return "degraded";
    }
    return "ok";
  }

  private collectIssues(
    records: readonly PluginRuntimeRecord[],
    dependencies: PluginDependencyGraphSnapshot,
    db: { ok: true } | { ok: false; reason: string },
  ): string[] {
    const issues: string[] = [];

    if (!db.ok) {
      issues.push(`db:${db.reason}`);
    }

    for (const record of records) {
      if (record.state === "failed") {
        issues.push(
          `plugin:${record.manifest.id}:failed:${record.lastFailurePhase ?? "unknown"}`,
        );
      } else if (record.state === "disabled") {
        issues.push(
          `plugin:${record.manifest.id}:disabled:${record.disabledReason ?? "unspecified"}`,
        );
      }
    }

    for (const edge of dependencies.edges) {
      if (edge.optional && edge.status !== "ok") {
        issues.push(`dependency:optional:${edge.from}->${edge.to}:${edge.status}`);
      }
      if (!edge.optional && edge.status !== "ok") {
        issues.push(`dependency:required:${edge.from}->${edge.to}:${edge.status}`);
      }
    }

    return issues;
  }
}
