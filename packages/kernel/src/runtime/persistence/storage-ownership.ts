import type { NamespaceContext } from "../../contracts/namespace-context.js";
import { DbAdapterError } from "../../errors/db-errors.js";

export function canonicalStorageTuple(context: NamespaceContext, entityName: string): string {
  if (
    !/^[a-z0-9][a-z0-9._/-]*$/.test(context.pluginId) ||
    !entityName ||
    entityName !== entityName.trim() ||
    (context.workspaceId !== undefined &&
      (!context.workspaceId || context.workspaceId !== context.workspaceId.trim()))
  ) {
    throw new DbAdapterError("Storage owner, workspace and entity must be canonical");
  }
  return JSON.stringify([context.pluginId, context.workspaceId ?? null, entityName]);
}
export function buildPhysicalCollectionName(context: NamespaceContext, entityName: string): string {
  canonicalStorageTuple(context, entityName);
  const workspace =
    context.workspaceId === undefined
      ? ""
      : `__workspace_${collectionComponent(context.workspaceId)}`;
  return `${collectionComponent(entityName)}__plugin_${collectionComponent(context.pluginId)}${workspace}`;
}
/** Reversible escaping keeps normal identifiers readable without collapsing distinct owners. */
function collectionComponent(value: string): string {
  return encodeURIComponent(value)
    .replace(/[.!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/__/g, "%5F%5F");
}
export const STORAGE_OWNERSHIP_COLLECTION = buildPhysicalCollectionName(
  { pluginId: "kernel" },
  "storage_ownership"
);
export interface StorageOwnershipStore {
  initialize(): Promise<void>;
  ensure(context: NamespaceContext, entityName: string, session?: unknown): Promise<void>;
}

interface OwnershipCollection {
  createIndexes?(
    indexes: Array<{ key: Record<string, 1 | -1>; unique: boolean; name: string }>
  ): Promise<unknown>;
  updateOne(
    filter: Record<string, unknown>,
    patch: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<unknown>;
  findOne(filter: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
}
export class MongoStorageOwnershipStore implements StorageOwnershipStore {
  private initialization?: Promise<void>;
  private initializationIdentity?: unknown;
  constructor(
    private readonly source: OwnershipCollection | (() => OwnershipCollection),
    private readonly identity: () => unknown = () => source
  ) {}
  private collection(): OwnershipCollection {
    return typeof this.source === "function" ? this.source() : this.source;
  }
  initialize(): Promise<void> {
    const identity = this.identity();
    if (identity !== this.initializationIdentity) {
      this.initialization = undefined;
      this.initializationIdentity = identity;
    }
    if (!this.initialization)
      this.initialization = (async () => {
        const collection = this.collection();
        if (!collection.createIndexes)
          throw new DbAdapterError("Storage ownership requires unique indexes");
        await collection.createIndexes([
          { key: { canonicalTuple: 1 }, unique: true, name: "storage_tuple_unique" },
          { key: { physicalName: 1 }, unique: true, name: "storage_physical_unique" }
        ]);
      })().catch((error) => {
        this.initialization = undefined;
        throw error;
      });
    return this.initialization;
  }
  async ensure(context: NamespaceContext, entityName: string, session?: unknown): Promise<void> {
    await this.initialize();
    const canonicalTuple = canonicalStorageTuple(context, entityName);
    const physicalName = buildPhysicalCollectionName(context, entityName);
    const expected = {
      canonicalTuple,
      physicalName,
      pluginId: context.pluginId,
      workspaceId: context.workspaceId ?? null,
      entityName
    };
    const options = session ? { session } : {};
    const collection = this.collection();
    await collection.updateOne(
      { canonicalTuple },
      { $setOnInsert: expected },
      { ...options, upsert: true }
    );
    const row = await collection.findOne({ canonicalTuple }, options);
    if (
      !row ||
      typeof row !== "object" ||
      Object.entries(expected).some(
        ([key, value]) => (row as Record<string, unknown>)[key] !== value
      )
    ) {
      throw new DbAdapterError("Storage ownership mapping conflicts with the canonical owner", {
        pluginId: context.pluginId,
        entityName
      });
    }
  }
}
/** Test implementation; production adapters default to the persistent Mongo store. */
export class InMemoryStorageOwnershipStore implements StorageOwnershipStore {
  readonly mappings = new Map<string, string>();
  async initialize(): Promise<void> {}
  async ensure(context: NamespaceContext, entityName: string): Promise<void> {
    const tuple = canonicalStorageTuple(context, entityName);
    const name = buildPhysicalCollectionName(context, entityName);
    if ([...this.mappings.entries()].some(([key, value]) => value === name && key !== tuple))
      throw new DbAdapterError("Storage ownership collision");
    this.mappings.set(tuple, name);
  }
}
