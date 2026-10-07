import { randomUUID } from "node:crypto";
import type { DbAdapter } from "../../contracts/db-adapter.js";
import type { PluginRuntime } from "../../contracts/plugin-runtime.js";
import type { PluginActivityRegistry } from "../plugin-runtime/plugin-activity.js";
import type { PluginMigrationRunner } from "./migration-runner.js";

export interface PluginRemovalHost {
  authorizeOperator(
    actorId: string,
    action: "uninstall" | "purge",
    pluginId: string
  ): Promise<void>;
  /** Cluster drain/instance acknowledgement is provided by the deployment coordinator. */
  drainInstances(pluginId: string): Promise<void>;
  revokeCredentialsAndGrants(pluginId: string, actorId: string): Promise<void>;
  detachArtifact(pluginId: string): Promise<void>;
  planPurge(pluginId: string): Promise<{
    references: readonly string[];
    resources: readonly { id: string; ownerPluginId: string }[];
    pendingDeliveries: number;
  }>;
  /** Deletes only resources in the operator-reviewed plan, never entire shared collections. */
  purgeOwnedResources(
    pluginId: string,
    resources: readonly string[],
    backupReference: string
  ): Promise<void>;
}
export class PluginRemovalService {
  constructor(
    private readonly runtime: PluginRuntime,
    private readonly activity: PluginActivityRegistry,
    private readonly runner: PluginMigrationRunner,
    private readonly adapter: DbAdapter,
    private readonly host: PluginRemovalHost,
    private readonly options: { drainTimeoutMs?: number } = {}
  ) {}
  private async preflight(pluginId: string) {
    const plugin = this.runtime.list().find((item) => item.manifest.id === pluginId);
    if (!plugin) throw new Error("Unknown uninstall owner");
    const dependents = this.runtime
      .list()
      .filter((item) =>
        item.manifest.dependencies?.some(
          (dependency) => dependency.pluginId === pluginId && !dependency.optional
        )
      );
    if (dependents.length)
      throw new Error("Required dependents must be removed explicitly before uninstall");
    if ((await this.runner.status({ pluginId })).some((record) => record.status === "running"))
      throw new Error("Migration in progress blocks uninstall/purge");
    return plugin;
  }
  async uninstall(pluginId: string, actorId: string): Promise<void> {
    if (!actorId.trim()) throw new Error("Authorized operator required");
    await this.host.authorizeOperator(actorId, "uninstall", pluginId);
    await this.preflight(pluginId);
    await this.audit(pluginId, actorId, "plugin.uninstall-requested");
    await this.runner.maintenance.set([{ pluginId }], true, actorId);
    await this.host.drainInstances(pluginId);
    await this.activity.drain(pluginId, this.options.drainTimeoutMs);
    await this.runtime.disable(pluginId, "Operator uninstall");
    await this.host.revokeCredentialsAndGrants(pluginId, actorId);
    await this.runtime.unregister(pluginId);
    await this.host.detachArtifact(pluginId);
    await this.audit(pluginId, actorId, "plugin.uninstalled");
  }
  async purge(
    pluginId: string,
    actorId: string,
    backupReference: string,
    expectedResources: readonly string[]
  ): Promise<void> {
    if (!actorId.trim() || !backupReference.trim())
      throw new Error("Purge requires authorized operator, backup and reviewed resource plan");
    await this.host.authorizeOperator(actorId, "purge", pluginId);
    const plugin = this.runtime.list().find((item) => item.manifest.id === pluginId);
    if (plugin?.state === "loaded") throw new Error("Uninstall/drain before purge");
    if (plugin) await this.preflight(pluginId);
    if (
      this.runtime
        .list()
        .some((item) =>
          item.manifest.dependencies?.some(
            (dependency) => dependency.pluginId === pluginId && !dependency.optional
          )
        )
    )
      throw new Error("Required dependents block purge");
    if ((await this.runner.status({ pluginId })).some((record) => record.status === "running"))
      throw new Error("Migration in progress blocks purge");
    await this.host.drainInstances(pluginId);
    await this.activity.drain(pluginId, this.options.drainTimeoutMs);
    const plan = await this.host.planPurge(pluginId);
    if (
      plan.resources.some((resource) => resource.ownerPluginId !== pluginId) ||
      plan.references.length ||
      plan.pendingDeliveries ||
      JSON.stringify(plan.resources.map((resource) => resource.id).sort()) !==
        JSON.stringify([...expectedResources].sort())
    )
      throw new Error("Purge plan changed, has references or pending deliveries");
    await this.audit(pluginId, actorId, "plugin.purge-requested");
    await this.host.purgeOwnedResources(pluginId, expectedResources, backupReference);
    await this.audit(pluginId, actorId, "plugin.purged");
  }
  private async audit(owner: string, actorId: string, action: string) {
    await this.adapter.repository("platform_audit", { pluginId: "kernel" }).insertOne({
      id: randomUUID(),
      at: new Date(),
      purgeAt: new Date(Date.now() + 90 * 86400000),
      owner,
      actorId,
      action,
      outcome: "allowed",
      actorKind: "user",
      instanceId: "deploy-host",
      resourceId: owner,
      reason: "operator-removal"
    });
  }
}
