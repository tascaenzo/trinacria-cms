import { createHash, randomUUID } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { DbRepository } from "../../contracts/db-adapter.js";
import type { NamespaceContext } from "../../contracts/namespace-context.js";
import type { JsonValue, PluginManifest } from "../../contracts/plugin-manifest.js";
import type {
  MigrationApplyOptions,
  PluginMigrationDefinition,
  PluginMigrationMetadata
} from "../../contracts/plugin-migrations.js";
import type { HostTransactionRepositories } from "../persistence/host-unit-of-work.js";
import { HostUnitOfWork } from "../persistence/host-unit-of-work.js";
import type { MongoDbAdapter } from "../persistence/mongo-db-adapter.js";
import { PlatformMaintenance } from "./maintenance.js";
import { type PlatformLease, PlatformLeaseLostError, PlatformLocks } from "./platform-locks.js";
import { duplicateKey, KERNEL_NAMESPACE } from "./platform-storage.js";

interface SchemaVersion {
  id: string;
  pluginId: string;
  namespace: string;
  entityName: string;
  version: number;
  baselineVersion?: number;
}
export interface MigrationRecord {
  id: string;
  pluginId: string;
  namespace: string;
  migrationId: string;
  checksum: string;
  status: "running" | "applied" | "failed" | "baseline";
  attempt: number;
  checkpoint: JsonValue;
  lockEpoch: number;
  actor: string;
  artifactVersion: string;
  artifactChecksum: string;
  updatedAt: string;
  errorCode?: string;
}
export interface MigrationPlan {
  pluginId: string;
  workspaceId?: string;
  pending: readonly PluginMigrationMetadata[];
  versions: Readonly<Record<string, number>>;
}
export class PluginMigrationError extends Error {
  readonly code = "plugin_migration_required";
}

/** Length-framed, path-sorted distributed file bytes. No imports or code execution. */
export async function computeMigrationChecksum(
  packageRoot: string,
  sourceFiles: readonly string[]
): Promise<string> {
  if (!sourceFiles.length || new Set(sourceFiles).size !== sourceFiles.length)
    throw new PluginMigrationError("Migration source files must be unique and nonempty");
  const root = await realpath(packageRoot),
    hash = createHash("sha256");
  for (const file of [...sourceFiles].sort()) {
    if (
      isAbsolute(file) ||
      file.includes("\\") ||
      file.split("/").some((part) => !part || part === ".." || part === ".")
    )
      throw new PluginMigrationError("Invalid distributed migration path");
    const target = await realpath(resolve(root, file));
    const path = relative(root, target);
    if (path.startsWith("..") || isAbsolute(path))
      throw new PluginMigrationError("Migration file escapes package root");
    const bytes = await readFile(target);
    hash.update(`${Buffer.byteLength(file)}:${file}:${bytes.length}:`).update(bytes);
  }
  return hash.digest("hex");
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b, "en"))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
function namespaceKey(namespace: NamespaceContext) {
  return JSON.stringify([namespace.pluginId, namespace.workspaceId ?? ""]);
}
function identity(namespace: NamespaceContext, value: string) {
  return JSON.stringify([namespaceKey(namespace), value]);
}
function metadata(definition: PluginMigrationDefinition): PluginMigrationMetadata {
  const { run: _run, ...data } = definition;
  return data;
}
function checkedCheckpoint(checkpoint: unknown): JsonValue {
  function visit(value: unknown): void {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    )
      return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (
      value &&
      typeof value === "object" &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value))
    ) {
      for (const [key, item] of Object.entries(value)) {
        if (["__proto__", "constructor", "prototype"].includes(key))
          throw new PluginMigrationError("Unsafe checkpoint key");
        visit(item);
      }
      return;
    }
    throw new PluginMigrationError("Checkpoint must be JSON");
  }
  visit(checkpoint);
  if (Buffer.byteLength(JSON.stringify(checkpoint)) > 65536)
    throw new PluginMigrationError("Checkpoint exceeds 64 KiB");
  return structuredClone(checkpoint) as JsonValue;
}
export class PluginMigrationRunner {
  readonly locks: PlatformLocks;
  readonly maintenance: PlatformMaintenance;
  private readonly uow: HostUnitOfWork;
  private readonly history: DbRepository<MigrationRecord>;
  private readonly versions: DbRepository<SchemaVersion>;
  constructor(
    private readonly adapter: MongoDbAdapter,
    private readonly options: {
      instanceId: string;
      packageRoot: string;
      leaseMs?: number;
      heartbeatMs?: number;
      batchSize?: number;
    }
  ) {
    this.uow = new HostUnitOfWork(adapter);
    this.locks = new PlatformLocks(adapter);
    this.maintenance = new PlatformMaintenance(adapter, this.uow);
    this.history = adapter.repository("plugin_migrations", KERNEL_NAMESPACE);
    this.versions = adapter.repository("plugin_schema_versions", KERNEL_NAMESPACE);
    if (!options.instanceId || (options.batchSize ?? 500) < 1 || (options.batchSize ?? 500) > 500)
      throw new PluginMigrationError("Invalid migration runner configuration");
    if ((options.heartbeatMs ?? 10000) >= (options.leaseMs ?? 30000) / 2)
      throw new PluginMigrationError("Heartbeat must be less than half the lease duration");
  }
  async assertSchemaCompatible(
    manifest: PluginManifest,
    namespace: NamespaceContext = { pluginId: manifest.id }
  ): Promise<void> {
    if (namespace.pluginId !== manifest.id) throw new PluginMigrationError("Schema owner mismatch");
    await this.maintenance.initializeOwner(namespace);
    for (const entity of manifest.entities ?? []) {
      const id = identity(namespace, entity.name);
      let current = await this.versions.findOne({ filter: { id } });
      if (!current) {
        if (await this.adapter.hasStoredRecords(namespace, entity.name))
          throw new PluginMigrationError(
            `Unversioned existing data for ${manifest.id}:${entity.name}; explicit baseline recovery required`
          );
        try {
          current = await this.versions.insertOne({
            id,
            pluginId: manifest.id,
            namespace: namespaceKey(namespace),
            entityName: entity.name,
            version: entity.schemaVersion,
            baselineVersion: entity.schemaVersion
          });
        } catch (error) {
          if (!duplicateKey(error)) throw error;
          current = await this.versions.findOne({ filter: { id } });
        }
      }
      if (current?.version !== entity.schemaVersion)
        throw new PluginMigrationError(
          `Pending migration or incompatible schema for ${manifest.id}:${entity.name}`
        );
    }
  }
  async verifyAppliedIntegrity(
    manifest: PluginManifest,
    definitions: readonly PluginMigrationDefinition[],
    namespace: NamespaceContext = { pluginId: manifest.id },
    initializeBaseline = false
  ): Promise<void> {
    const history = await this.status(namespace);
    if ((manifest.migrations ?? []).length !== definitions.length)
      throw new PluginMigrationError("Manifest/code migration inventory differs");
    for (const definition of definitions) {
      const declared = manifest.migrations?.find((item) => item.id === definition.id);
      if (
        canonical(declared) !== canonical(metadata(definition)) ||
        (await computeMigrationChecksum(this.options.packageRoot, definition.sourceFiles)) !==
          definition.checksum
      )
        throw new PluginMigrationError("Distributed migration checksum/metadata mismatch");
      const recorded = history.find((item) => item.migrationId === definition.id);
      if (recorded && recorded.checksum !== definition.checksum)
        throw new PluginMigrationError("Previously recorded migration checksum changed");
      if (!recorded && initializeBaseline) {
        const versions = await Promise.all(
          definition.entities.map((entity) =>
            this.versions.findOne({ filter: { id: identity(namespace, entity) } })
          )
        );
        if (
          versions.length &&
          versions.every((record) => (record?.baselineVersion ?? 0) >= definition.toSchemaVersion)
        ) {
          try {
            await this.history.insertOne({
              id: identity(namespace, definition.id),
              pluginId: namespace.pluginId,
              namespace: namespaceKey(namespace),
              migrationId: definition.id,
              checksum: definition.checksum,
              status: "baseline",
              attempt: 0,
              checkpoint: null,
              lockEpoch: 0,
              actor: "fresh-schema-bootstrap",
              artifactVersion: manifest.version,
              artifactChecksum: "",
              updatedAt: new Date().toISOString()
            });
          } catch (error) {
            if (!duplicateKey(error)) throw error;
          }
        }
      }
    }
    for (const record of history)
      if (
        !definitions.some(
          (definition) =>
            definition.id === record.migrationId && definition.checksum === record.checksum
        )
      )
        throw new PluginMigrationError("Previously recorded migration was removed or changed");
  }
  async status(namespace: NamespaceContext): Promise<readonly MigrationRecord[]> {
    return this.history.findMany({
      filter: { pluginId: namespace.pluginId, namespace: namespaceKey(namespace) },
      sort: { migrationId: "asc" },
      limit: 1000
    });
  }
  async plan(
    manifest: PluginManifest,
    definitions: readonly PluginMigrationDefinition[],
    namespace: NamespaceContext = { pluginId: manifest.id }
  ): Promise<MigrationPlan> {
    if (namespace.pluginId !== manifest.id)
      throw new PluginMigrationError("Migration owner mismatch");
    if (definitions.length > 1000)
      throw new PluginMigrationError("Migration inventory exceeds supported history limit");
    await this.verifyAppliedIntegrity(manifest, definitions, namespace);
    const declared = manifest.migrations ?? [];
    if (declared.length !== definitions.length)
      throw new PluginMigrationError("Manifest/code migration inventory differs");
    const ids = new Set<string>(),
      entities = new Map(
        (manifest.entities ?? []).map((entity) => [entity.name, entity.schemaVersion])
      );
    for (const definition of definitions) {
      if (!/^\d{4}-[a-z0-9][a-z0-9-]*$/.test(definition.id) || ids.has(definition.id))
        throw new PluginMigrationError("Migration IDs must be unique and sequentially named");
      ids.add(definition.id);
      if (
        !definition.entities.length ||
        new Set(definition.entities).size !== definition.entities.length ||
        definition.entities.some((entity) => !entities.has(entity))
      )
        throw new PluginMigrationError("Migration entities must be declared by their owner");
      if (
        !Number.isSafeInteger(definition.fromSchemaVersion) ||
        definition.fromSchemaVersion < 1 ||
        definition.toSchemaVersion !== definition.fromSchemaVersion + 1
      )
        throw new PluginMigrationError("Migration must advance exactly one schema version");
      if (definition.kind === "batched" && !definition.idempotent)
        throw new PluginMigrationError("Batched migrations require idempotent transforms");
      const declaration = declared.find((item) => item.id === definition.id);
      if (canonical(declaration) !== canonical(metadata(definition)))
        throw new PluginMigrationError("Manifest/code migration metadata differs");
      if (
        !/^[a-f0-9]{64}$/.test(definition.checksum) ||
        (await computeMigrationChecksum(this.options.packageRoot, definition.sourceFiles)) !==
          definition.checksum
      )
        throw new PluginMigrationError(`Distributed migration checksum mismatch: ${definition.id}`);
    }
    const history = await this.status(namespace);
    const applied = new Set(
      history
        .filter((item) => item.status === "applied" || item.status === "baseline")
        .map((item) => item.migrationId)
    );
    for (const record of history) {
      const definition = definitions.find((item) => item.id === record.migrationId);
      if (!definition || record.checksum !== definition.checksum)
        throw new PluginMigrationError("Previously recorded migration was removed or changed");
    }
    const versions: Record<string, number> = {};
    for (const [name] of entities) {
      const record = await this.versions.findOne({ filter: { id: identity(namespace, name) } });
      if (!record)
        throw new PluginMigrationError(
          `Schema baseline missing for ${name}; bootstrap the previous artifact or recover explicitly`
        );
      versions[name] = record.version;
    }
    const simulated = { ...versions },
      pending: PluginMigrationMetadata[] = [];
    for (const definition of [...definitions].sort((a, b) => a.id.localeCompare(b.id, "en"))) {
      if (applied.has(definition.id)) continue;
      if (
        (definition.prerequisites ?? []).some(
          (id) => !applied.has(id) && !pending.some((item) => item.id === id)
        )
      )
        throw new PluginMigrationError("Migration prerequisite missing");
      if (definition.entities.some((entity) => simulated[entity] !== definition.fromSchemaVersion))
        throw new PluginMigrationError("Migration chain is incomplete or schemas diverge");
      for (const entity of definition.entities) simulated[entity] = definition.toSchemaVersion;
      pending.push(metadata(definition));
    }
    for (const [name, target] of entities)
      if (simulated[name] !== target)
        throw new PluginMigrationError(`Incomplete migration chain for ${name}`);
    return { pluginId: manifest.id, workspaceId: namespace.workspaceId, pending, versions };
  }
  async apply(
    manifest: PluginManifest,
    definitions: readonly PluginMigrationDefinition[],
    options: MigrationApplyOptions,
    namespace: NamespaceContext = { pluginId: manifest.id }
  ): Promise<void> {
    if (
      !options.actorId.trim() ||
      options.artifactVersion !== manifest.version ||
      !/^[a-f0-9]{64}$/.test(options.artifactChecksum)
    )
      throw new PluginMigrationError("Verified artifact version/checksum and operator required");
    await this.maintenance.assertActive(namespace);
    let plan = await this.plan(manifest, definitions, namespace);
    if (
      plan.pending.some((item) => item.destructive) &&
      (!options.allowDestructive || !options.backupReference?.trim())
    )
      throw new PluginMigrationError(
        "Destructive migration requires explicit permission and verified backup reference"
      );
    const lease = await this.locks.acquire(
      `migrations:${namespaceKey(namespace)}`,
      this.options.instanceId,
      this.options.leaseMs
    );
    if (!lease) throw new PluginMigrationError("Another migration runner owns the lease");
    const abort = new AbortController();
    let heartbeatFailure: unknown;
    let renewing: Promise<void> | undefined;
    const heartbeat = setInterval(() => {
      if (renewing) return;
      renewing = this.locks
        .renew(lease, this.options.leaseMs)
        .catch((error) => {
          heartbeatFailure = error;
          abort.abort();
        })
        .finally(() => {
          renewing = undefined;
        });
    }, this.options.heartbeatMs ?? 10000);
    try {
      // Re-read after acquiring the lock: a previous runner may have completed the plan.
      plan = await this.plan(manifest, definitions, namespace);
      for (const step of plan.pending) {
        if (heartbeatFailure) throw heartbeatFailure;
        const definition = definitions.find((item) => item.id === step.id)!;
        let record = await this.begin(namespace, definition, lease, options);
        if (record.status === "failed" && (!definition.idempotent || !options.resumeFailed))
          throw new PluginMigrationError(
            "Failed migration requires explicit idempotent resume or a recovery plan"
          );
        try {
          if (definition.kind === "index") {
            await this.uow.run([KERNEL_NAMESPACE], (repos) => this.locks.fence(repos, lease), {
              bypassMaintenance: true
            });
            await definition.run(
              this.context(namespace, definition, record.checkpoint, abort.signal)
            );
            if (heartbeatFailure) throw heartbeatFailure;
            // DDL may have committed before a lost lease. Re-running must reconcile actual indexes.
            await this.commitStep(namespace, definition, lease, options, record.checkpoint, true);
          } else {
            let done = false;
            while (!done) {
              if (heartbeatFailure) throw heartbeatFailure;
              await this.maintenance.assertActive(namespace);
              const outcome = await this.uow.run(
                [KERNEL_NAMESPACE, namespace],
                async (repositories) => {
                  await this.locks.fence(repositories, lease);
                  await this.maintenance.fenceActive(repositories, namespace);
                  const history = repositories.repository<MigrationRecord>(
                    "plugin_migrations",
                    KERNEL_NAMESPACE
                  );
                  const current = await history.findOne({
                    filter: { id: record.id, checksum: definition.checksum }
                  });
                  if (!current || current.status === "applied")
                    throw new PluginMigrationError("Migration checkpoint state changed");
                  const result = await definition.run(
                    this.context(
                      namespace,
                      definition,
                      current.checkpoint,
                      abort.signal,
                      repositories
                    )
                  );
                  await this.locks.fence(repositories, lease);
                  if (heartbeatFailure) throw heartbeatFailure;
                  const complete =
                    definition.kind === "transactional" || Boolean(result && result.done);
                  if (
                    definition.kind === "batched" &&
                    (!result || typeof result.done !== "boolean")
                  )
                    throw new PluginMigrationError(
                      "Batched migration must return checkpoint and done"
                    );
                  const checkpoint =
                    definition.kind === "batched" && result
                      ? checkedCheckpoint(result.checkpoint)
                      : current.checkpoint;
                  if (
                    !complete &&
                    JSON.stringify(checkpoint) === JSON.stringify(current.checkpoint)
                  )
                    throw new PluginMigrationError("Batched migration made no checkpoint progress");
                  await this.recordCommit(
                    repositories,
                    namespace,
                    definition,
                    lease,
                    options,
                    checkpoint,
                    complete
                  );
                  return { checkpoint, complete };
                },
                { bypassMaintenance: true }
              );
              record = { ...record, checkpoint: outcome.checkpoint };
              done = outcome.complete;
            }
          }
        } catch (error) {
          // A stale runner cannot overwrite a newer runner's history with failure.
          await this.uow
            .run(
              [KERNEL_NAMESPACE],
              async (repositories) => {
                await this.locks.fence(repositories, lease);
                await repositories
                  .repository<MigrationRecord>("plugin_migrations", KERNEL_NAMESPACE)
                  .updateOne(
                    { filter: { id: record.id, lockEpoch: lease.epoch, status: "running" } },
                    {
                      status: "failed",
                      errorCode:
                        error instanceof PlatformLeaseLostError ? "lease_lost" : "migration_failed",
                      updatedAt: new Date().toISOString()
                    }
                  );
              },
              { bypassMaintenance: true }
            )
            .catch(() => undefined);
          throw error;
        }
      }
    } finally {
      clearInterval(heartbeat);
      await renewing;
      await this.locks.release(lease);
    }
  }
  private context(
    namespace: NamespaceContext,
    definition: PluginMigrationDefinition,
    checkpoint: JsonValue,
    signal: AbortSignal,
    repositories?: HostTransactionRepositories
  ) {
    return Object.freeze({
      pluginId: namespace.pluginId,
      workspaceId: namespace.workspaceId,
      batchSize: this.options.batchSize ?? 500,
      checkpoint: checkedCheckpoint(checkpoint),
      signal,
      repository: <T>(name: string) => {
        if (!repositories || !definition.entities.includes(name))
          throw new PluginMigrationError(
            "Migration repository outside transactional entity allowlist"
          );
        return repositories.repository<T>(name, namespace);
      },
      ensureIndexes: async (names: readonly string[]) => {
        if (
          definition.kind !== "index" ||
          names.some((name) => !definition.entities.includes(name)) ||
          namespace.workspaceId
        )
          throw new PluginMigrationError("Index operation outside allowed migration scope");
        await this.adapter.ensureIndexes(namespace.pluginId, names);
      }
    });
  }
  private async begin(
    namespace: NamespaceContext,
    definition: PluginMigrationDefinition,
    lease: PlatformLease,
    options: MigrationApplyOptions
  ): Promise<MigrationRecord> {
    return this.uow.run(
      [KERNEL_NAMESPACE],
      async (repositories) => {
        await this.locks.fence(repositories, lease);
        const history = repositories.repository<MigrationRecord>(
            "plugin_migrations",
            KERNEL_NAMESPACE
          ),
          id = identity(namespace, definition.id);
        const existing = await history.findOne({ filter: { id } });
        if (existing?.status === "failed" && (!definition.idempotent || !options.resumeFailed))
          return existing;
        if (existing?.status === "running" && !definition.idempotent)
          throw new PluginMigrationError(
            "Interrupted non-idempotent migration requires explicit recovery"
          );
        const record: MigrationRecord = {
          id,
          pluginId: namespace.pluginId,
          namespace: namespaceKey(namespace),
          migrationId: definition.id,
          checksum: definition.checksum,
          status: "running",
          attempt: (existing?.attempt ?? 0) + 1,
          checkpoint: existing?.checkpoint ?? null,
          lockEpoch: lease.epoch,
          actor: options.actorId,
          artifactVersion: options.artifactVersion,
          artifactChecksum: options.artifactChecksum,
          updatedAt: new Date().toISOString()
        };
        if (existing)
          await history.updateOne({ filter: { id, checksum: definition.checksum } }, record);
        else await history.insertOne(record);
        return record;
      },
      { bypassMaintenance: true }
    );
  }
  private async commitStep(
    namespace: NamespaceContext,
    definition: PluginMigrationDefinition,
    lease: PlatformLease,
    options: MigrationApplyOptions,
    checkpoint: JsonValue,
    complete: boolean
  ) {
    await this.uow.run(
      [KERNEL_NAMESPACE],
      async (repositories) => {
        await this.locks.fence(repositories, lease);
        await this.maintenance.fenceActive(repositories, namespace);
        await this.recordCommit(
          repositories,
          namespace,
          definition,
          lease,
          options,
          checkpoint,
          complete
        );
      },
      { bypassMaintenance: true }
    );
  }
  private async recordCommit(
    repositories: HostTransactionRepositories,
    namespace: NamespaceContext,
    definition: PluginMigrationDefinition,
    lease: PlatformLease,
    options: MigrationApplyOptions,
    checkpoint: JsonValue,
    complete: boolean
  ) {
    const record = await repositories
      .repository<MigrationRecord>("plugin_migrations", KERNEL_NAMESPACE)
      .updateOne(
        {
          filter: {
            id: identity(namespace, definition.id),
            lockEpoch: lease.epoch,
            status: "running"
          }
        },
        {
          checkpoint,
          status: complete ? "applied" : "running",
          updatedAt: new Date().toISOString()
        }
      );
    if (!record) throw new PlatformLeaseLostError("Migration history fence changed");
    if (!complete) return;
    for (const name of definition.entities) {
      const updated = await repositories
        .repository<SchemaVersion>("plugin_schema_versions", KERNEL_NAMESPACE)
        .updateOne(
          { filter: { id: identity(namespace, name), version: definition.fromSchemaVersion } },
          { version: definition.toSchemaVersion }
        );
      if (!updated) throw new PluginMigrationError("Schema version changed during migration");
    }
    await repositories.repository("platform_audit", KERNEL_NAMESPACE).insertOne({
      id: randomUUID(),
      at: new Date(),
      purgeAt: new Date(Date.now() + 90 * 86400000),
      instanceId: this.options.instanceId,
      actorId: options.actorId,
      owner: namespace.pluginId,
      action: "migration.applied",
      resourceId: definition.id,
      outcome: "allowed",
      actorKind: "user",
      reason: "migration-applied",
      epoch: lease.epoch,
      artifactChecksum: options.artifactChecksum,
      backupReference: options.backupReference ?? ""
    });
  }
}
