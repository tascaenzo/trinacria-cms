import type { NamespaceContext } from "./namespace-context.js";

/**
 * Mongo-first query shape used by kernel repositories.
 * The contract intentionally keeps a small abstract surface so services do not depend
 * on the concrete Mongo driver API, while still mapping directly to Mongo concepts.
 */
export interface DbQuery<TData = unknown> {
  /** Free-form Mongo-like filter predicate (normalized by the adapter). */
  filter?: Record<string, unknown>;
  /** Maximum number of records to return. */
  limit?: number;
  /** Pagination offset. */
  offset?: number;
  /** Field-based sorting. */
  sort?: Record<string, "asc" | "desc">;
  /** Field selection (projection style). */
  projection?: Record<string, 0 | 1>;
  /** Optional metadata for adapter-specific hints (tracing, lock mode, etc.). */
  metadata?: Record<string, unknown>;
  /** Optional parser to normalize/validate read records. */
  parse?: (value: unknown) => TData;
}

/**
 * Minimal CRUD contract for namespaced entities.
 * Each plugin uses repositories isolated by its NamespaceContext.
 */
export interface DbRepository<TData = unknown> {
  findOne(query: DbQuery<TData>): Promise<TData | null>;
  findMany(query: DbQuery<TData>): Promise<readonly TData[]>;
  /**
   * Inserts a new record.
   * Adapters can enrich partial payloads with generated fields (id, timestamps, etc.).
   */
  insertOne(data: Partial<TData>): Promise<TData>;
  updateOne(query: DbQuery<TData>, patch: Partial<TData>): Promise<TData | null>;
  deleteOne(query: DbQuery<TData>): Promise<boolean>;
}

/**
 * Abstract transaction handle over Mongo sessions.
 * Implementations define the exact session lifecycle and commit/rollback semantics.
 */
export interface DbTransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Mongo-first persistence entry point for the kernel.
 *
 * This contract deliberately mirrors Mongo concepts (filter objects, projection,
 * sort descriptors) because Trinacria CMS is a Mongo-first platform. It is NOT
 * an abstract multi-database adapter. Future support for other databases would
 * require a new architectural decision, not a generic abstraction.
 */
export interface DbAdapter {
  /** Returns entity-scoped repositories for plugin/workspace namespaces. */
  repository<TData = unknown>(entityName: string, context: NamespaceContext): DbRepository<TData>;
  /**
   * Optional adapter capability to materialize declared entity indexes.
   * Implementations that do not support it can omit this method.
   */
  ensureIndexes?(pluginId: string, entityNames: readonly string[]): Promise<void>;
  /** Starts a namespaced transaction. */
  beginTransaction(context: NamespaceContext): Promise<DbTransaction>;
  /** Exposes adapter health for health endpoints and readiness checks. */
  healthCheck(): Promise<{ ok: true } | { ok: false; reason: string }>;
}
