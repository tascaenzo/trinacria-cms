import { AsyncLocalStorage } from "node:async_hooks";
import type {
  DbAdapter,
  DbQuery,
  DbRepository,
  DbTransaction
} from "../../contracts/db-adapter.js";
import type { NamespaceContext } from "../../contracts/namespace-context.js";
import { DbAdapterError } from "../../errors/db-errors.js";
import type { EntityIndexDefinition, EntityRegistry } from "./entity-registry.js";
import type { HostTransactionRepositories } from "./host-unit-of-work.js";
import {
  buildPhysicalCollectionName,
  canonicalStorageTuple,
  MongoStorageOwnershipStore,
  STORAGE_OWNERSHIP_COLLECTION,
  type StorageOwnershipStore
} from "./storage-ownership.js";

interface MongoSessionLike {
  startTransaction?(): void;
  withTransaction?<T>(work: () => Promise<T>): Promise<T | undefined>;
  commitTransaction(): Promise<void>;
  abortTransaction(): Promise<void>;
  endSession?(): Promise<void>;
}

interface MongoCursorLike<TData> {
  sort(sort: Record<string, 1 | -1>): MongoCursorLike<TData>;
  skip(value: number): MongoCursorLike<TData>;
  limit(value: number): MongoCursorLike<TData>;
  toArray(): Promise<TData[]>;
}

interface MongoCollectionLike<TData> {
  findOne(
    filter?: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<TData | null>;
  find(filter?: Record<string, unknown>, options?: Record<string, unknown>): MongoCursorLike<TData>;
  insertOne(document: TData, options?: Record<string, unknown>): Promise<{ insertedId?: unknown }>;
  findOneAndUpdate(
    filter: Record<string, unknown>,
    patch: Partial<TData> | Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<{ value: TData | null } | TData | null>;
  updateOne(
    filter: Record<string, unknown>,
    patch: Partial<TData> | Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<unknown>;
  deleteOne(
    filter: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<{ deletedCount?: number }>;
  indexes?(): Promise<
    Array<{ name: string; key: Record<string, 1 | -1>; unique?: boolean; sparse?: boolean }>
  >;
  dropIndex?(name: string): Promise<unknown>;
  createIndexes?(
    indexes: Array<{
      key: Record<string, 1 | -1>;
      unique?: boolean;
      sparse?: boolean;
      expireAfterSeconds?: number;
      partialFilterExpression?: Record<string, unknown>;
      name?: string;
    }>
  ): Promise<unknown>;
}

interface MongoConnectionLike {
  collection<TData = unknown>(name: string): MongoCollectionLike<TData>;
  startSession(): Promise<MongoSessionLike>;
  db?: {
    command(command: Record<string, unknown>): Promise<unknown>;
  };
}

export interface MongoDbAdapterOptions {
  connection: MongoConnectionLike;
  entityRegistry: EntityRegistry;
  ownershipStore?: StorageOwnershipStore;
}

interface InternalRepositoryOptions {
  session?: MongoSessionLike;
  assertActive?: () => void;
}

class MongoDbTransaction implements DbTransaction {
  constructor(private readonly session: MongoSessionLike) {}

  async commit(): Promise<void> {
    await this.session.commitTransaction();
    await this.session.endSession?.();
  }

  async rollback(): Promise<void> {
    await this.session.abortTransaction();
    await this.session.endSession?.();
  }
}

export class MongoDbAdapter implements DbAdapter {
  private readonly transactionScope = new AsyncLocalStorage<boolean>();
  private needsWriteTransaction(context: NamespaceContext): boolean {
    return Boolean(this.writeGuard && context.pluginId !== "kernel");
  }
  private readonly ownership: StorageOwnershipStore;
  private writeGuard?: (
    repositories: HostTransactionRepositories,
    namespaces: readonly NamespaceContext[]
  ) => Promise<void>;
  /** Host-only maintenance guard; plugins cannot replace or bypass it. */
  setWriteGuard(guard: NonNullable<MongoDbAdapter["writeGuard"]>): void {
    if (this.writeGuard) throw new DbAdapterError("Write guard is already configured");
    this.writeGuard = guard;
  }
  async hasStoredRecords(namespace: NamespaceContext, entityName: string): Promise<boolean> {
    await this.initializeStorageOwnership();
    return Boolean(
      await this.options.connection
        .collection(buildPhysicalCollectionName(namespace, entityName))
        .findOne({})
    );
  }
  private legacyCheck?: Promise<void>;
  private legacyCheckDatabase?: MongoConnectionLike["db"];
  constructor(private readonly options: MongoDbAdapterOptions) {
    this.ownership =
      options.ownershipStore ??
      new MongoStorageOwnershipStore(
        () => options.connection.collection(STORAGE_OWNERSHIP_COLLECTION),
        () => options.connection.db
      );
  }
  async initializeStorageOwnership(): Promise<void> {
    const database = this.options.connection.db;
    if (!database && !this.options.ownershipStore)
      throw new DbAdapterError("Mongo database must be connected before storage initialization");
    if (database !== this.legacyCheckDatabase) {
      this.legacyCheck = undefined;
      this.legacyCheckDatabase = database;
    }
    if (!this.legacyCheck)
      this.legacyCheck = this.assertNoLegacyStorage().catch((error) => {
        this.legacyCheck = undefined;
        throw error;
      });
    await this.legacyCheck;
    await this.ownership.initialize();
  }
  private async assertNoLegacyStorage(): Promise<void> {
    if (!this.options.connection.db) return;
    const result = (await this.options.connection.db.command({
      listCollections: 1,
      filter: { name: { $regex: "^(?!.*__plugin_)(plugin_|kernel__|v2_[a-f0-9]{64}$)" } },
      nameOnly: true
    })) as { cursor?: { firstBatch?: unknown[] } };
    if (result.cursor?.firstBatch?.length)
      throw new DbAdapterError(
        "Previous storage layout detected; use an empty database or an explicit reviewed data migration. No data was changed."
      );
  }

  repository<TData = unknown>(entityName: string, context: NamespaceContext): DbRepository<TData> {
    context = Object.freeze({ ...context });
    const collection = this.resolveCollection<TData>(entityName, context);
    return this.createRepository(collection, context, entityName);
  }

  async beginTransaction(_context: NamespaceContext): Promise<DbTransaction> {
    if (this.transactionScope.getStore())
      throw new DbAdapterError("Nested transactions are not supported");
    const session = await this.options.connection.startSession();
    session.startTransaction?.();
    return new MongoDbTransaction(session);
  }

  async withTransaction<T>(
    context: NamespaceContext,
    work: (adapter: DbAdapter) => Promise<T>
  ): Promise<T> {
    return this.runHostTransaction([context], async (repositories) => {
      const scoped: DbAdapter = {
        repository: <TData>(entityName: string, namespace: NamespaceContext) =>
          repositories.repository<TData>(entityName, namespace),
        beginTransaction: async () => {
          throw new DbAdapterError("Nested transactions are not supported");
        },
        healthCheck: () => this.healthCheck()
      };
      return work(scoped);
    });
  }

  async runHostTransaction<T>(
    allowedNamespaces: readonly NamespaceContext[],
    work: (repositories: HostTransactionRepositories) => Promise<T>,
    transactionOptions: { bypassMaintenance?: boolean } = {}
  ): Promise<T> {
    if (this.transactionScope.getStore())
      throw new DbAdapterError("Nested transactions are not supported");
    const allowed = new Set(
      allowedNamespaces.map((namespace) => canonicalStorageTuple(namespace, "__scope"))
    );
    if (!allowed.size) throw new DbAdapterError("Host transaction namespace allowlist is required");
    await this.initializeStorageOwnership();
    const session = await this.options.connection.startSession();
    try {
      if (!session.withTransaction)
        throw new DbAdapterError(
          "Mongo transactions require a replica set and session.withTransaction"
        );
      let result: T;
      await session.withTransaction(() =>
        this.transactionScope.run(true, async () => {
          let active = true;
          const assertActive = () => {
            if (!active) throw new DbAdapterError("Transaction repository scope has ended");
          };
          try {
            const repositories = Object.freeze({
              repository: <TData>(entityName: string, namespace: NamespaceContext) => {
                assertActive();
                if (!allowed.has(canonicalStorageTuple(namespace, "__scope")))
                  throw new DbAdapterError("Transaction namespace is outside the host allowlist");
                const context = Object.freeze({ ...namespace });
                return this.createRepository(
                  this.resolveCollection<TData>(entityName, context),
                  context,
                  entityName,
                  { session, assertActive }
                );
              }
            });
            const guardedRepositories = Object.freeze({
              repository: <TData>(entityName: string, namespace: NamespaceContext) =>
                namespace.pluginId === "kernel" && !namespace.workspaceId
                  ? this.createRepository(
                      this.resolveCollection<TData>(entityName, namespace),
                      namespace,
                      entityName,
                      { session, assertActive }
                    )
                  : repositories.repository<TData>(entityName, namespace)
            });
            if (this.writeGuard && !transactionOptions.bypassMaintenance)
              await this.writeGuard(guardedRepositories, allowedNamespaces);
            result = await work(repositories);
            if (this.writeGuard && !transactionOptions.bypassMaintenance)
              await this.writeGuard(guardedRepositories, allowedNamespaces);
          } finally {
            active = false;
          }
        })
      );
      return result!;
    } finally {
      await session.endSession?.();
    }
  }

  async healthCheck(): Promise<{ ok: true } | { ok: false; reason: string }> {
    try {
      if (this.options.connection.db) {
        await this.options.connection.db.command({ ping: 1 });
        return { ok: true };
      }
      const session = await this.options.connection.startSession();
      await session.endSession?.();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async ensureIndexes(pluginId: string, entityNames: readonly string[]): Promise<void> {
    for (const entityName of entityNames) {
      const definition = this.options.entityRegistry.get(entityName, pluginId);
      await this.initializeStorageOwnership();
      await this.ownership.ensure({ pluginId }, entityName);
      const collection = this.resolveCollection(entityName, { pluginId });
      const indexes = definition.indexes ?? [];
      if (!collection.createIndexes || indexes.length === 0) continue;
      // Create the replacement first: existing data remains protected throughout migration.
      await collection.createIndexes(indexes.map((index) => toMongoIndex(index)));
      if (collection.indexes && collection.dropIndex) {
        const existing = await collection.indexes();
        for (const index of indexes.filter(
          (candidate) => candidate.unique && candidate.partialFilter
        )) {
          for (const legacy of existing) {
            if (
              legacy.sparse &&
              legacy.unique &&
              legacy.name !== index.name &&
              JSON.stringify(legacy.key) === JSON.stringify(index.fields)
            ) {
              await collection.dropIndex(legacy.name);
            }
          }
        }
      }
    }
  }

  private resolveCollection<TData = unknown>(
    entityName: string,
    context: NamespaceContext
  ): MongoCollectionLike<TData> {
    this.options.entityRegistry.get(entityName, context.pluginId);
    const collectionName = buildPhysicalCollectionName(context, entityName);
    return this.options.connection.collection<TData>(collectionName);
  }

  private createRepository<TData = unknown>(
    collection: MongoCollectionLike<TData>,
    context: NamespaceContext,
    entityName: string,
    options: InternalRepositoryOptions = {}
  ): DbRepository<TData> {
    return {
      findOne: async (query) => {
        options.assertActive?.();
        await this.initializeStorageOwnership();
        await this.ownership.ensure(context, entityName, options.session);
        options.assertActive?.();
        const found = await collection.findOne(query.filter ?? {}, toReadOptions(query, options));
        if (!found) return null;
        return this.applyParser(query, this.normalizeReadRecord(found, context, entityName));
      },

      findMany: async (query) => {
        options.assertActive?.();
        await this.initializeStorageOwnership();
        await this.ownership.ensure(context, entityName, options.session);
        options.assertActive?.();
        let cursor = collection.find(query.filter ?? {}, toReadOptions(query, options));
        if (query.sort) {
          cursor = cursor.sort(toMongoSort(query.sort));
        }
        if (query.offset !== undefined) {
          cursor = cursor.skip(query.offset);
        }
        if (query.limit !== undefined) {
          cursor = cursor.limit(query.limit);
        }
        const values = await cursor.toArray();
        return values.map((value) =>
          this.applyParser(query, this.normalizeReadRecord(value, context, entityName))
        );
      },

      insertOne: async (data) => {
        if (!options.session && this.needsWriteTransaction(context))
          return this.runHostTransaction([context, { pluginId: "kernel" }], async (repositories) =>
            repositories.repository<TData>(entityName, context).insertOne(data)
          );
        options.assertActive?.();
        await this.initializeStorageOwnership();
        await this.ownership.ensure(context, entityName, options.session);
        options.assertActive?.();
        const document = this.normalizeInsertPayload(data, context);
        const result = await collection.insertOne(document as TData, toWriteOptions(options));
        const insertedId = result.insertedId;
        const storageId = insertedId ?? document._id;

        if (!document.id && storageId !== undefined) {
          document.id = this.buildCanonicalId(context.pluginId, entityName, storageId);
          await collection.updateOne(
            { _id: storageId },
            toMongoUpdateDocument({ id: document.id } as unknown as Partial<TData>),
            toWriteOptions(options)
          );
        }

        return this.normalizeReadRecord(document, context, entityName) as TData;
      },

      updateOne: async (query, patch) => {
        if (!options.session && this.needsWriteTransaction(context))
          return this.runHostTransaction([context, { pluginId: "kernel" }], async (repositories) =>
            repositories.repository<TData>(entityName, context).updateOne(query, patch)
          );
        options.assertActive?.();
        await this.initializeStorageOwnership();
        await this.ownership.ensure(context, entityName, options.session);
        options.assertActive?.();
        const result = await collection.findOneAndUpdate(
          query.filter ?? {},
          toMongoUpdateDocument(patch),
          {
            returnDocument: "after",
            ...toWriteOptions(options)
          }
        );
        const updatedValue = extractFindOneAndUpdateValue(result);
        if (!updatedValue) return null;
        return this.applyParser(query, this.normalizeReadRecord(updatedValue, context, entityName));
      },

      deleteOne: async (query) => {
        if (!options.session && this.needsWriteTransaction(context))
          return this.runHostTransaction([context, { pluginId: "kernel" }], async (repositories) =>
            repositories.repository<TData>(entityName, context).deleteOne(query)
          );
        options.assertActive?.();
        await this.initializeStorageOwnership();
        await this.ownership.ensure(context, entityName, options.session);
        options.assertActive?.();
        const outcome = await collection.deleteOne(query.filter ?? {}, toWriteOptions(options));
        return (outcome.deletedCount ?? 0) > 0;
      }
    };
  }

  private applyParser<TData>(query: DbQuery<TData>, value: unknown): TData {
    if (query.parse) return query.parse(value);
    return value as TData;
  }

  private normalizeInsertPayload<TData>(
    data: Partial<TData>,
    _context: NamespaceContext
  ): Record<string, unknown> {
    const record = this.asRecord(data);
    return {
      ...record
    };
  }

  private normalizeReadRecord(
    value: unknown,
    context: NamespaceContext,
    entityName: string
  ): unknown {
    const record = this.asRecord(value);
    const normalized: Record<string, unknown> = {
      ...record
    };

    const storageId = record._id;
    if (!normalized.id && storageId !== undefined) {
      normalized.id = this.buildCanonicalId(context.pluginId, entityName, storageId);
    }

    delete normalized._id;
    return normalized;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new DbAdapterError("Mongo adapter expected a plain object document");
    }
    return value as Record<string, unknown>;
  }

  private buildCanonicalId(pluginId: string, entityName: string, storageId: unknown): string {
    return `${pluginId}:${entityName}:${String(storageId)}`;
  }
}

export function createMongoDbAdapter(options: MongoDbAdapterOptions): MongoDbAdapter {
  return new MongoDbAdapter(options);
}

function toMongoSort(sort: Record<string, "asc" | "desc">): Record<string, 1 | -1> {
  return Object.fromEntries(
    Object.entries(sort).map(([field, direction]) => [field, direction === "asc" ? 1 : -1])
  );
}

function toWriteOptions(options: InternalRepositoryOptions): Record<string, unknown> | undefined {
  if (!options.session) return undefined;
  return { session: options.session };
}

function toReadOptions(
  query: DbQuery<unknown>,
  options: InternalRepositoryOptions
): Record<string, unknown> {
  const result: Record<string, unknown> = { readPreference: "primary" };
  if (query.projection) {
    result.projection = query.projection;
  }
  if (options.session) {
    result.session = options.session;
  }
  return result;
}

function toMongoIndex(index: EntityIndexDefinition): {
  key: Record<string, 1 | -1>;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: Record<string, unknown>;
  name?: string;
} {
  const mapped: {
    key: Record<string, 1 | -1>;
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
    partialFilterExpression?: Record<string, unknown>;
    name?: string;
  } = {
    key: index.fields
  };
  if (index.unique !== undefined) {
    mapped.unique = index.unique;
  }
  if (index.sparse !== undefined) {
    mapped.sparse = index.sparse;
  }
  if (index.expireAfterSeconds !== undefined) {
    mapped.expireAfterSeconds = index.expireAfterSeconds;
  }
  if (index.partialFilter !== undefined) {
    mapped.partialFilterExpression = index.partialFilter;
  }
  if (index.name !== undefined) {
    mapped.name = index.name;
  }
  return mapped;
}

function toMongoUpdateDocument<TData>(
  patch: Partial<TData>
): Partial<TData> | { $set?: Partial<TData>; $unset?: Record<string, ""> } {
  const keys = Object.keys(patch as Record<string, unknown>);
  if (keys.length === 0) return patch;
  if (keys.some((key) => key.startsWith("$"))) return patch;

  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) {
      unset[key] = "";
    } else {
      set[key] = value;
    }
  }

  return {
    ...(Object.keys(set).length > 0 ? { $set: set as Partial<TData> } : {}),
    ...(Object.keys(unset).length > 0 ? { $unset: unset } : {})
  };
}

function extractFindOneAndUpdateValue<TData>(
  value: { value: TData | null } | TData | null
): TData | null {
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    return value as TData;
  }

  const maybeRecord = value as Record<string, unknown>;
  const keys = Object.keys(maybeRecord);
  const isLegacyResultWrapper =
    "value" in maybeRecord &&
    (keys.length === 1 || "lastErrorObject" in maybeRecord || "ok" in maybeRecord);
  if (isLegacyResultWrapper) {
    return (maybeRecord.value as TData | null) ?? null;
  }

  return value as TData;
}
