import type { DbAdapter, DbQuery, DbRepository, DbTransaction } from "../contracts/db-adapter.js";
import type { NamespaceContext } from "../contracts/namespace-context.js";
import { buildNamespaceKey } from "../contracts/namespace-context.js";
import { DbAdapterError } from "../errors/db-errors.js";
import { EntityRegistry, type EntityIndexDefinition } from "./entity-registry.js";

interface MongoSessionLike {
  startTransaction?(): void;
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
  createIndexes?(
    indexes: Array<{
      key: Record<string, 1 | -1>;
      unique?: boolean;
      sparse?: boolean;
      name?: string;
    }>
  ): Promise<unknown>;
}

interface MongoConnectionLike {
  collection<TData = unknown>(name: string): MongoCollectionLike<TData>;
  startSession(): Promise<MongoSessionLike>;
}

export interface MongoDbAdapterOptions {
  connection: MongoConnectionLike;
  entityRegistry: EntityRegistry;
}

interface InternalRepositoryOptions {
  session?: MongoSessionLike;
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

/**
 * Mongo implementation of DbAdapter using a collection-level API.
 * Plugins remain storage-agnostic and declare canonical schemas once.
 */
export class MongoDbAdapter implements DbAdapter {
  constructor(private readonly options: MongoDbAdapterOptions) {}

  repository<TData = unknown>(entityName: string, context: NamespaceContext): DbRepository<TData> {
    const collection = this.resolveCollection<TData>(entityName, context);
    return this.createRepository(collection, context, entityName);
  }

  async beginTransaction(_context: NamespaceContext): Promise<DbTransaction> {
    const session = await this.options.connection.startSession();
    session.startTransaction?.();
    return new MongoDbTransaction(session);
  }

  async healthCheck(): Promise<{ ok: true } | { ok: false; reason: string }> {
    try {
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

  /**
   * Ensures declared indexes exist for selected entities in a plugin namespace.
   */
  async ensureIndexes(pluginId: string, entityNames: readonly string[]): Promise<void> {
    for (const entityName of entityNames) {
      const definition = this.options.entityRegistry.get(entityName);
      const collection = this.resolveCollection(entityName, { pluginId });
      const indexes = definition.indexes ?? [];
      if (!collection.createIndexes || indexes.length === 0) continue;
      await collection.createIndexes(indexes.map((index) => toMongoIndex(index)));
    }
  }

  private resolveCollection<TData = unknown>(
    entityName: string,
    context: NamespaceContext
  ): MongoCollectionLike<TData> {
    this.options.entityRegistry.get(entityName);
    const collectionName = this.buildCollectionName(context, entityName);
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
        const found = await collection.findOne(query.filter ?? {}, toReadOptions(query, options));
        if (!found) return null;
        return this.applyParser(query, this.normalizeReadRecord(found, context, entityName));
      },

      findMany: async (query) => {
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
        const outcome = await collection.deleteOne(query.filter ?? {}, toWriteOptions(options));
        return (outcome.deletedCount ?? 0) > 0;
      }
    };
  }

  private buildCollectionName(context: NamespaceContext, entityName: string): string {
    const namespace = this.buildStorageNamespace(context);
    const entity = sanitizeIdentifier(entityName);
    return `${namespace}__${entity}`;
  }

  /**
   * Keeps logical namespace semantics intact while allowing reserved infrastructure
   * namespaces to use cleaner physical collection names.
   */
  private buildStorageNamespace(context: NamespaceContext): string {
    const pluginId = context.pluginId.trim().toLowerCase();
    if (pluginId === "kernel") {
      if (context.workspaceId) {
        return `kernel_workspace_${sanitizeIdentifier(context.workspaceId)}`;
      }
      return "kernel";
    }

    return sanitizeIdentifier(buildNamespaceKey(context));
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

/**
 * Factory helper for MongoDbAdapter.
 */
export function createMongoDbAdapter(options: MongoDbAdapterOptions): MongoDbAdapter {
  return new MongoDbAdapter(options);
}

function toMongoSort(sort: Record<string, "asc" | "desc">): Record<string, 1 | -1> {
  return Object.fromEntries(
    Object.entries(sort).map(([field, direction]) => [field, direction === "asc" ? 1 : -1])
  );
}

function sanitizeIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toWriteOptions(options: InternalRepositoryOptions): Record<string, unknown> | undefined {
  if (!options.session) return undefined;
  return { session: options.session };
}

function toReadOptions(
  query: DbQuery<unknown>,
  options: InternalRepositoryOptions
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
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
  name?: string;
} {
  const mapped: {
    key: Record<string, 1 | -1>;
    unique?: boolean;
    sparse?: boolean;
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
  if (index.name !== undefined) {
    mapped.name = index.name;
  }
  return mapped;
}

function toMongoUpdateDocument<TData>(
  patch: Partial<TData>
): Partial<TData> | { $set: Partial<TData> } {
  const keys = Object.keys(patch as Record<string, unknown>);
  if (keys.length === 0) return patch;
  if (keys.some((key) => key.startsWith("$"))) return patch;
  return { $set: patch };
}

function extractFindOneAndUpdateValue<TData>(
  value: { value: TData | null } | TData | null
): TData | null {
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    return value as TData;
  }

  const maybeRecord = value as Record<string, unknown>;
  if ("value" in maybeRecord) {
    return (maybeRecord.value as TData | null) ?? null;
  }

  return value as TData;
}
