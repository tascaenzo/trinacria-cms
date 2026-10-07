import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, realpath } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { s } from "@trinacria/schema";
import type {
  PluginArtifact,
  PluginClusterOperation,
  PluginClusterOperationInput,
  PluginClusterSnapshot,
  PluginDesiredState,
  PluginInstanceObservation
} from "../../contracts/plugin-cluster.js";
import type { PluginRuntime, PluginRuntimeRecord } from "../../contracts/plugin-runtime.js";
import { PlatformMaintenance } from "../migrations/maintenance.js";
import { type PlatformLease, PlatformLocks } from "../migrations/platform-locks.js";
import {
  duplicateKey,
  KERNEL_NAMESPACE,
  registerPlatformEntities
} from "../migrations/platform-storage.js";
import { defineEntity, type EntityRegistry } from "../persistence/entity-registry.js";
import {
  type HostTransactionRepositories,
  HostUnitOfWork
} from "../persistence/host-unit-of-work.js";
import type { MongoDbAdapter } from "../persistence/mongo-db-adapter.js";
import type { PluginActivityRegistry } from "../plugin-runtime/plugin-activity.js";

const common = s.object({}, { strict: false });
export const PLUGIN_CLUSTER_ENTITIES = [
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "plugin_cluster_control",
    schema: common,
    indexes: [{ fields: { id: 1 }, unique: true, name: "plugin_cluster_control_id" }]
  }),
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "plugin_desired_state",
    schema: common,
    indexes: [{ fields: { pluginId: 1 }, unique: true, name: "plugin_desired_identity" }]
  }),
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "plugin_instances",
    schema: common,
    indexes: [
      { fields: { instanceId: 1 }, unique: true, name: "plugin_instance_identity" },
      { fields: { leaseUntil: 1 }, name: "plugin_instance_lease" }
    ]
  }),
  defineEntity({
    ownerPluginId: "kernel",
    entityName: "plugin_operations",
    schema: common,
    indexes: [
      { fields: { operationId: 1 }, unique: true, name: "plugin_operation_id" },
      {
        fields: { actorId: 1, idempotencyKey: 1 },
        unique: true,
        name: "plugin_operation_idempotency"
      },
      { fields: { status: 1, expiresAt: 1 }, name: "plugin_operation_pending" }
    ]
  })
];
interface DesiredRecord extends PluginDesiredState {
  id: string;
  fenceRevision: number;
}
interface InstanceRecord {
  id: string;
  instanceId: string;
  epoch: number;
  heartbeat: Date;
  leaseUntil: Date;
  observations: Record<string, Omit<PluginInstanceObservation, "instanceId" | "healthy">>;
}
interface OperationRecord extends Omit<PluginClusterOperation, "instances"> {
  id: string;
  actorId: string;
  idempotencyKey: string;
  inputHash: string;
}
export class PluginClusterError extends Error {
  constructor(
    readonly code:
      | "plugin_cluster_conflict"
      | "plugin_cluster_unavailable"
      | "plugin_cluster_disabled"
      | "plugin_cluster_artifact_mismatch",
    message: string
  ) {
    super(message);
  }
}
/** Deployed package fingerprint: immutable package.json + every dist byte; no manifest-only checksum. */
export async function computePluginArtifactChecksum(packageRoot: string): Promise<string> {
  const root = await realpath(packageRoot);
  const hash = createHash("sha256");
  const files = ["package.json"];
  async function walk(directory: string) {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Artifact files must not be symlinks");
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  await walk("dist");
  if (files.length < 2) throw new Error("Compiled artifact is empty");
  for (const file of files.sort()) {
    const resolved = await realpath(join(root, file));
    const path = relative(root, resolved);
    if (path.startsWith(`..${sep}`) || path === "..")
      throw new Error("Artifact escapes package root");
    const bytes = await readFile(resolved);
    hash.update(
      `${file.replaceAll(sep, "/").length}:${file.replaceAll(sep, "/")}:${bytes.length}:`
    );
    hash.update(bytes);
  }
  return hash.digest("hex");
}
export interface PluginClusterOptions {
  instanceId: string;
  artifacts: Readonly<Record<string, PluginArtifact>>;
  activity: PluginActivityRegistry;
  reconcileMs?: number;
  heartbeatMs?: number;
  leaseMs?: number;
  operationTimeoutMs?: number;
  now?: () => number;
}
/** Shared control plane. Local runtime state is only an observation of this desired state. */
export class PluginClusterCoordinator {
  private readonly uow: HostUnitOfWork;
  private readonly locks: PlatformLocks;
  private lease?: PlatformLease;
  private readonly observations: InstanceRecord["observations"] = Object.create(null);
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private reconcileTimer?: ReturnType<typeof setInterval>;
  private reconciling?: Promise<void>;
  private heartbeating?: Promise<void>;
  private closed = false;
  private storeAvailable = false;
  private readonly now: () => number;
  readonly metrics = { storeFailures: 0, reconcileFailures: 0, desiredLag: 0 };
  constructor(
    private readonly adapter: MongoDbAdapter,
    private readonly registry: EntityRegistry,
    private readonly runtime: PluginRuntime,
    private readonly options: PluginClusterOptions
  ) {
    registerPlatformEntities(this.registry);
    this.uow = new HostUnitOfWork(adapter);
    this.now = options.now ?? Date.now;
    this.locks = new PlatformLocks(adapter, this.now);
    if (!/^[a-zA-Z0-9._-]{1,120}$/.test(options.instanceId))
      throw new Error("Invalid cluster instance ID");
    for (const value of [
      options.reconcileMs ?? 2000,
      options.heartbeatMs ?? 5000,
      options.leaseMs ?? 15000,
      options.operationTimeoutMs ?? 30000
    ])
      if (!Number.isSafeInteger(value) || value < 1) throw new Error("Invalid cluster timing");
    if ((options.heartbeatMs ?? 5000) >= (options.leaseMs ?? 15000))
      throw new Error("Heartbeat must precede lease expiry");
  }
  private repository<T>(entity: string) {
    return this.adapter.repository<T>(entity, KERNEL_NAMESPACE);
  }
  isInitialized(): boolean {
    return !!this.lease && this.storeAvailable;
  }
  async initialize() {
    registerPlatformEntities(this.registry);
    for (const entity of PLUGIN_CLUSTER_ENTITIES) this.registry.register(entity);
    await this.adapter.ensureIndexes("kernel", [
      ...PLUGIN_CLUSTER_ENTITIES.map((e) => e.entityName),
      "platform_locks",
      "platform_audit"
    ]);
    this.lease =
      (await this.locks.acquire(
        `instance:${this.options.instanceId}`,
        this.options.instanceId,
        this.options.leaseMs ?? 15000
      )) ?? undefined;
    if (!this.lease)
      throw new PluginClusterError(
        "plugin_cluster_conflict",
        "Cluster instance ID is already leased"
      );
    try {
      await this.repository<{ id: string; revision: number }>("plugin_cluster_control").insertOne({
        id: "policy",
        revision: 0
      });
    } catch (error) {
      if (!duplicateKey(error)) throw error;
    }
    for (const record of this.runtime.list()) {
      const artifact = this.options.artifacts[record.manifest.id];
      if (
        !artifact ||
        artifact.version !== record.manifest.version ||
        !/^[a-f0-9]{64}$/.test(artifact.checksum)
      )
        throw new PluginClusterError(
          "plugin_cluster_artifact_mismatch",
          "Host artifact inventory must match every registered plugin"
        );
      if (
        await this.repository<DesiredRecord>("plugin_desired_state").findOne({
          filter: { pluginId: record.manifest.id }
        })
      )
        continue;
      try {
        await this.repository<DesiredRecord>("plugin_desired_state").insertOne({
          id: record.manifest.id,
          pluginId: record.manifest.id,
          artifactVersion: artifact.version,
          artifactChecksum: artifact.checksum,
          enabled: record.state !== "disabled",
          revision: 1,
          fenceRevision: 0,
          updatedBy: "host-bootstrap",
          reason: "initial-installation",
          updatedAt: new Date(this.now()).toISOString()
        });
      } catch (e) {
        if (!duplicateKey(e)) throw e;
      }
    }
    await this.heartbeat();
    this.storeAvailable = true;
  }
  async start() {
    await this.reconcile();
    this.heartbeatTimer = setInterval(() => {
      void this.heartbeat().catch(() => this.unavailable());
    }, this.options.heartbeatMs ?? 5000);
    this.reconcileTimer = setInterval(() => {
      void this.reconcile().catch(() => this.unavailable());
    }, this.options.reconcileMs ?? 2000);
    this.heartbeatTimer.unref();
    this.reconcileTimer.unref();
  }
  async close() {
    this.closed = true;
    clearInterval(this.heartbeatTimer);
    clearInterval(this.reconcileTimer);
    await Promise.allSettled([this.heartbeating, this.reconciling].filter(Boolean));
    if (this.lease) await this.locks.release(this.lease);
    this.storeAvailable = false;
  }
  private unavailable() {
    this.storeAvailable = false;
    this.metrics.storeFailures++;
  }
  async heartbeat(): Promise<void> {
    if (this.heartbeating) return this.heartbeating;
    this.heartbeating = this.performHeartbeat().finally(() => {
      this.heartbeating = undefined;
    });
    return this.heartbeating;
  }
  private async performHeartbeat() {
    if (this.closed || !this.lease)
      throw new PluginClusterError("plugin_cluster_unavailable", "Cluster instance lease was lost");
    await this.locks.renew(this.lease, this.options.leaseMs ?? 15000);
    const now = this.now(),
      data: InstanceRecord = {
        id: this.options.instanceId,
        instanceId: this.options.instanceId,
        epoch: this.lease.epoch,
        heartbeat: new Date(now),
        leaseUntil: new Date(now + (this.options.leaseMs ?? 15000)),
        observations: structuredClone(this.observations)
      };
    const repository = this.repository<InstanceRecord>("plugin_instances");
    const current = await repository.findOne({ filter: { instanceId: data.instanceId } });
    if (current) {
      if (
        !(await repository.updateOne(
          { filter: { instanceId: data.instanceId, epoch: { $lte: this.lease.epoch } } },
          data
        ))
      )
        throw new PluginClusterError("plugin_cluster_unavailable", "Instance incarnation changed");
    } else await repository.insertOne(data);
    this.storeAvailable = true;
  }
  async assertActive(pluginId: string) {
    try {
      await this.assertLease();
      const desired = await this.repository<DesiredRecord>("plugin_desired_state").findOne({
        filter: { pluginId }
      });
      if (!desired?.enabled)
        throw new PluginClusterError(
          "plugin_cluster_disabled",
          "Plugin is disabled in shared desired state"
        );
      this.assertArtifact(desired);
    } catch (e) {
      if (e instanceof PluginClusterError) throw e;
      this.unavailable();
      throw new PluginClusterError("plugin_cluster_unavailable", "Shared plugin state unavailable");
    }
  }
  private assertArtifact(desired: PluginDesiredState) {
    const artifact = this.options.artifacts[desired.pluginId];
    if (
      artifact?.version !== desired.artifactVersion ||
      artifact?.checksum !== desired.artifactChecksum
    )
      throw new PluginClusterError(
        "plugin_cluster_artifact_mismatch",
        "Local artifact does not match shared desired state"
      );
  }
  private async assertLease() {
    if (this.closed || !this.lease)
      throw new PluginClusterError(
        "plugin_cluster_unavailable",
        "Instance is not participating in the cluster"
      );
    if (!(await this.locks.isActive(this.lease)))
      throw new PluginClusterError("plugin_cluster_unavailable", "Cluster instance lease was lost");
  }
  /** Domain writes touch desired state and the instance lease in the same Mongo commit. */
  async fenceWrites(
    repositories: HostTransactionRepositories,
    namespaces: readonly { pluginId: string }[]
  ) {
    if (!this.lease || this.closed)
      throw new PluginClusterError("plugin_cluster_unavailable", "Cluster lease missing");
    await this.locks.fence(repositories, this.lease);
    const desiredRepo = repositories.repository<DesiredRecord>(
      "plugin_desired_state",
      KERNEL_NAMESPACE
    );
    for (const pluginId of new Set(
      namespaces.map((n) => n.pluginId).filter((id) => id !== "kernel")
    )) {
      const desired = await desiredRepo.findOne({ filter: { pluginId } });
      if (!desired?.enabled)
        throw new PluginClusterError(
          "plugin_cluster_disabled",
          "Plugin writes are disabled by shared state"
        );
      this.assertArtifact(desired);
      if (
        !(await desiredRepo.updateOne(
          {
            filter: {
              pluginId,
              revision: desired.revision,
              fenceRevision: desired.fenceRevision,
              enabled: true
            }
          },
          { fenceRevision: desired.fenceRevision + 1 }
        ))
      )
        throw new PluginClusterError(
          "plugin_cluster_conflict",
          "Desired state changed before commit"
        );
    }
  }
  async submit(
    pluginId: string,
    input: PluginClusterOperationInput,
    actorId: string
  ): Promise<PluginClusterOperation> {
    if (
      !actorId ||
      !Number.isSafeInteger(input.expectedRevision) ||
      input.expectedRevision < 1 ||
      !/^[a-zA-Z0-9._-]{8,120}$/.test(input.idempotencyKey) ||
      !["load", "enable", "disable", "unload", "reload"].includes(input.operation)
    )
      throw new Error("Invalid cluster operation input");
    const inputHash = createHash("sha256")
      .update(
        JSON.stringify([pluginId, input.operation, input.expectedRevision, input.reason ?? ""])
      )
      .digest("hex");
    const previous = await this.repository<OperationRecord>("plugin_operations").findOne({
      filter: { actorId, idempotencyKey: input.idempotencyKey }
    });
    if (previous) {
      if (previous.inputHash !== inputHash)
        throw new PluginClusterError(
          "plugin_cluster_conflict",
          "Idempotency key was used for a different command"
        );
      return this.status(previous.operationId);
    }
    await this.assertLease();
    const desiredStates = await this.repository<DesiredRecord>("plugin_desired_state").findMany({
      limit: 1000
    });
    if (["disable", "unload"].includes(input.operation)) {
      const dependents = this.runtime
        .list()
        .filter(
          (record) =>
            record.manifest.dependencies?.some((d) => !d.optional && d.pluginId === pluginId) &&
            desiredStates.find((d) => d.pluginId === record.manifest.id)?.enabled
        );
      if (dependents.length)
        throw new PluginClusterError(
          "plugin_cluster_conflict",
          "Disable required dependents through an explicit plan first"
        );
    }
    const participants = (
      await this.repository<InstanceRecord>("plugin_instances").findMany({
        filter: { leaseUntil: { $gt: new Date(this.now()) } },
        limit: 1000
      })
    ).map((instance) => instance.instanceId);
    const operationId = randomUUID();
    try {
      await this.uow.run(
        [KERNEL_NAMESPACE],
        async (repositories) => {
          await this.locks.fence(repositories, this.lease!);
          const control = repositories.repository<{ id: string; revision: number }>(
            "plugin_cluster_control",
            KERNEL_NAMESPACE
          );
          const policy = await control.findOne({ filter: { id: "policy" } });
          if (
            !policy ||
            !(await control.updateOne(
              { filter: { id: "policy", revision: policy.revision } },
              { revision: policy.revision + 1 }
            ))
          )
            throw new PluginClusterError(
              "plugin_cluster_conflict",
              "Concurrent dependency policy change"
            );
          const desiredRepo = repositories.repository<DesiredRecord>(
            "plugin_desired_state",
            KERNEL_NAMESPACE
          );
          const states = await desiredRepo.findMany({ limit: 1000 });
          if (
            ["disable", "unload"].includes(input.operation) &&
            this.runtime
              .list()
              .some(
                (record) =>
                  record.manifest.dependencies?.some(
                    (d) => !d.optional && d.pluginId === pluginId
                  ) && states.find((s) => s.pluginId === record.manifest.id)?.enabled
              )
          )
            throw new PluginClusterError(
              "plugin_cluster_conflict",
              "Required dependent is enabled"
            );
          if (
            !["disable", "unload"].includes(input.operation) &&
            this.runtime
              .list()
              .find((record) => record.manifest.id === pluginId)
              ?.manifest.dependencies?.some(
                (d) => !d.optional && !states.find((s) => s.pluginId === d.pluginId)?.enabled
              )
          )
            throw new PluginClusterError(
              "plugin_cluster_conflict",
              "Required dependency is disabled"
            );
          const current = await desiredRepo.findOne({ filter: { pluginId } });
          if (!current || current.revision !== input.expectedRevision)
            throw new PluginClusterError("plugin_cluster_conflict", "Desired revision changed");
          if (!["disable", "unload"].includes(input.operation)) this.assertArtifact(current);
          const revision = current.revision + 1,
            enabled = !["disable", "unload"].includes(input.operation),
            now = this.now();
          if (
            !(await desiredRepo.updateOne(
              { filter: { pluginId, revision: current.revision } },
              {
                enabled,
                revision,
                updatedBy: actorId,
                reason: input.reason ?? "operator-command",
                updatedAt: new Date(now).toISOString()
              }
            ))
          )
            throw new PluginClusterError(
              "plugin_cluster_conflict",
              "Concurrent desired state change"
            );
          await repositories
            .repository<OperationRecord>("plugin_operations", KERNEL_NAMESPACE)
            .insertOne({
              id: operationId,
              operationId,
              pluginId,
              operation: input.operation,
              desiredRevision: revision,
              status: "pending",
              actorId,
              idempotencyKey: input.idempotencyKey,
              inputHash,
              submittedAt: new Date(now).toISOString(),
              expiresAt: new Date(now + (this.options.operationTimeoutMs ?? 30000)).toISOString(),
              participants
            });
          await repositories.repository("platform_audit", KERNEL_NAMESPACE).insertOne({
            id: randomUUID(),
            owner: pluginId,
            at: new Date(now),
            instanceId: this.options.instanceId,
            actorKind: "user",
            actorId,
            action: `plugin.${input.operation}`,
            resourceId: pluginId,
            outcome: "allowed",
            reason: "desired-state-submitted",
            revision,
            purgeAt: new Date(now + 90 * 86400000)
          });
        },
        { bypassMaintenance: true }
      );
    } catch (error) {
      if (duplicateKey(error)) {
        const repeated = await this.repository<OperationRecord>("plugin_operations").findOne({
          filter: { actorId, idempotencyKey: input.idempotencyKey }
        });
        if (repeated?.inputHash === inputHash) return this.status(repeated.operationId);
      }
      throw error;
    }
    return this.status(operationId);
  }
  /** Trusted deploy CLI only: disabled, drained hosts, maintenance and verified schema required. */
  async adoptDeployedArtifact(
    pluginId: string,
    expectedRevision: number,
    actorId: string,
    verifySchema: () => Promise<void>
  ): Promise<PluginDesiredState> {
    if (!actorId.trim() || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
      throw new Error("Authorized deploy operator and revision required");
    const artifact = this.options.artifacts[pluginId];
    if (!artifact || typeof verifySchema !== "function")
      throw new Error("Verified compiled artifact and schema preflight required");
    await this.assertLease();
    await verifySchema();
    const maintenance = new PlatformMaintenance(this.adapter, this.uow);
    await this.uow.run(
      [KERNEL_NAMESPACE],
      async (repositories) => {
        await this.locks.fence(repositories, this.lease!);
        await maintenance.fenceActive(repositories, { pluginId });
        const repository = repositories.repository<DesiredRecord>(
          "plugin_desired_state",
          KERNEL_NAMESPACE
        );
        const desired = await repository.findOne({ filter: { pluginId } });
        if (!desired || desired.enabled || desired.revision !== expectedRevision)
          throw new PluginClusterError(
            "plugin_cluster_conflict",
            "Disable and drain the expected desired revision before deploying"
          );
        const instances = await repositories
          .repository<InstanceRecord>("plugin_instances", KERNEL_NAMESPACE)
          .findMany({ filter: { leaseUntil: { $gt: new Date(this.now()) } }, limit: 1000 });
        // This CLI instance has not loaded business code. Every other live host must acknowledge drain.
        if (
          instances.some(
            (instance) =>
              instance.instanceId !== this.options.instanceId &&
              (instance.observations[pluginId]?.observedRevision !== expectedRevision ||
                instance.observations[pluginId]?.state !== "disabled")
          )
        )
          throw new PluginClusterError(
            "plugin_cluster_conflict",
            "A live instance has not acknowledged drain"
          );
        if (
          !(await repository.updateOne(
            { filter: { pluginId, enabled: false, revision: expectedRevision } },
            {
              artifactVersion: artifact.version,
              artifactChecksum: artifact.checksum,
              revision: expectedRevision + 1,
              updatedBy: actorId,
              reason: "verified-artifact-deploy",
              updatedAt: new Date(this.now()).toISOString()
            }
          ))
        )
          throw new PluginClusterError("plugin_cluster_conflict", "Concurrent artifact deployment");
        await repositories.repository("platform_audit", KERNEL_NAMESPACE).insertOne({
          id: randomUUID(),
          owner: pluginId,
          at: new Date(this.now()),
          instanceId: this.options.instanceId,
          actorKind: "user",
          actorId,
          action: "plugin.artifact-adopted",
          resourceId: pluginId,
          outcome: "allowed",
          reason: "verified-disabled-deploy",
          revision: expectedRevision + 1,
          purgeAt: new Date(this.now() + 90 * 86400000)
        });
      },
      { bypassMaintenance: true }
    );
    return (await this.snapshot(pluginId)).desired;
  }
  async snapshot(pluginId: string): Promise<PluginClusterSnapshot> {
    const record = await this.repository<DesiredRecord>("plugin_desired_state").findOne({
      filter: { pluginId }
    });
    if (!record)
      throw new PluginClusterError("plugin_cluster_unavailable", "Shared plugin state missing");
    const { id: _id, fenceRevision: _fence, ...desired } = record;
    return { desired, instances: await this.instanceObservations(pluginId) };
  }
  private async instanceObservations(pluginId: string): Promise<PluginInstanceObservation[]> {
    return (
      await this.repository<InstanceRecord>("plugin_instances").findMany({ limit: 1000 })
    ).map((instance) => {
      const observation = instance.observations[pluginId];
      const artifact = this.options.artifacts[pluginId];
      return {
        instanceId: instance.instanceId,
        observedRevision: observation?.observedRevision ?? 0,
        state: observation?.state ?? "failed",
        reason: observation?.reason ?? "not-observed",
        artifactVersion: observation?.artifactVersion ?? artifact?.version ?? "",
        artifactChecksum: observation?.artifactChecksum ?? "",
        healthy: instance.leaseUntil.getTime() > this.now()
      };
    });
  }
  async status(operationId: string): Promise<PluginClusterOperation> {
    const record = await this.repository<OperationRecord>("plugin_operations").findOne({
      filter: { operationId }
    });
    if (!record) throw new Error("Cluster operation not found");
    const instances = (await this.instanceObservations(record.pluginId)).filter((instance) =>
      record.participants.includes(instance.instanceId)
    );
    const expected = ["disable", "unload"].includes(record.operation) ? "disabled" : "loaded";
    const acknowledged = instances.filter(
      (instance) =>
        instance.healthy &&
        instance.observedRevision === record.desiredRevision &&
        instance.state === expected
    );
    const failures = instances.filter(
      (instance) =>
        instance.observedRevision === record.desiredRevision && instance.state === "failed"
    );
    let status = record.status;
    if (status === "pending") {
      if (record.participants.length > 0 && acknowledged.length === record.participants.length)
        status = "succeeded";
      else if (failures.length || Date.parse(record.expiresAt) <= this.now())
        status = acknowledged.length ? "partial" : "failed";
      if (status !== "pending")
        await this.repository<OperationRecord>("plugin_operations").updateOne(
          { filter: { operationId, status: "pending" } },
          { status }
        );
    }
    const {
      id: _id,
      actorId: _actor,
      idempotencyKey: _key,
      inputHash: _hash,
      ...publicRecord
    } = record;
    return { ...publicRecord, status, instances };
  }
  async reconcile(): Promise<void> {
    if (this.reconciling) return this.reconciling;
    this.reconciling = this.performReconcile().finally(() => {
      this.reconciling = undefined;
    });
    return this.reconciling;
  }
  private async performReconcile() {
    await this.assertLease();
    const desired = await this.repository<DesiredRecord>("plugin_desired_state").findMany({
      limit: 1000
    });
    this.metrics.desiredLag = 0;
    for (const state of desired) {
      const record = this.runtime.list().find((record) => record.manifest.id === state.pluginId);
      if (!record) continue;
      const current = this.observations[state.pluginId];
      if (
        current?.observedRevision === state.revision &&
        current.state === (state.enabled ? "loaded" : "disabled")
      )
        continue;
      this.metrics.desiredLag++;
      try {
        if (state.enabled) this.assertArtifact(state);
        if (!state.enabled) {
          this.options.activity.block(state.pluginId);
          if (record.state !== "disabled") await this.runtime.disable(state.pluginId, state.reason);
        } else {
          if (record.state === "disabled") await this.runtime.enable(state.pluginId);
          const reload =
            record.state === "loaded" && current && current.observedRevision !== state.revision;
          if (reload) await this.runtime.reload(state.pluginId);
          else if (record.state !== "loaded") await this.runtime.load(state.pluginId);
        }
        this.observations[state.pluginId] = {
          observedRevision: state.revision,
          state: state.enabled ? "loaded" : "disabled",
          artifactVersion: this.options.artifacts[state.pluginId]?.version ?? "",
          artifactChecksum: this.options.artifacts[state.pluginId]?.checksum ?? ""
        };
      } catch {
        this.metrics.reconcileFailures++;
        this.observations[state.pluginId] = {
          observedRevision: state.revision,
          state: "failed",
          reason: "artifact-or-lifecycle-failed",
          artifactVersion: this.options.artifacts[state.pluginId]?.version ?? "",
          artifactChecksum: this.options.artifacts[state.pluginId]?.checksum ?? ""
        };
      }
    }
    await this.heartbeat();
    const pending = await this.repository<OperationRecord>("plugin_operations").findMany({
      filter: { status: "pending" },
      limit: 100
    });
    for (const operation of pending) await this.status(operation.operationId);
  }
  async readiness(): Promise<{ ok: boolean; reason?: string }> {
    try {
      await this.assertLease();
      for (const record of this.runtime.list()) {
        const snapshot = await this.snapshot(record.manifest.id);
        this.assertArtifact(snapshot.desired);
        const local = snapshot.instances.find((i) => i.instanceId === this.options.instanceId);
        if (
          !local?.healthy ||
          local.observedRevision !== snapshot.desired.revision ||
          local.state !== (snapshot.desired.enabled ? "loaded" : "disabled")
        )
          return { ok: false, reason: "desired-state-not-converged" };
      }
      return {
        ok: this.storeAvailable,
        ...(this.storeAvailable ? {} : { reason: "cluster-store-unavailable" })
      };
    } catch {
      this.unavailable();
      return { ok: false, reason: "cluster-lease-or-store-unavailable" };
    }
  }
}
