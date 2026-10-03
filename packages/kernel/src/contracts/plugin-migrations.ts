import type { DbRepository } from "./db-adapter.js";
import type { JsonValue } from "./plugin-manifest.js";

/** Experimental deploy contract. Files are immutable, distributed code of a trusted plugin. */
export interface PluginMigrationMetadata {
  id: string;
  checksum: string;
  sourceFiles: readonly string[];
  entities: readonly string[];
  fromSchemaVersion: number;
  toSchemaVersion: number;
  kind: "transactional" | "batched" | "index";
  destructive: boolean;
  idempotent: boolean;
  prerequisites?: readonly string[];
}
export interface MigrationBatchResult {
  done: boolean;
  checkpoint: JsonValue;
}
export interface MigrationContext {
  readonly pluginId: string;
  readonly workspaceId?: string;
  readonly batchSize: number;
  readonly checkpoint: JsonValue;
  readonly signal: AbortSignal;
  repository<T = unknown>(entityName: string): DbRepository<T>;
  /** DDL is available only in index steps; create replacements before deleting old indexes. */
  ensureIndexes(entityNames: readonly string[]): Promise<void>;
}
export interface PluginMigrationDefinition extends PluginMigrationMetadata {
  run(context: MigrationContext): Promise<void> | Promise<MigrationBatchResult>;
}
export interface MigrationApplyOptions {
  actorId: string;
  artifactVersion: string;
  artifactChecksum: string;
  backupReference?: string;
  allowDestructive?: boolean;
  resumeFailed?: boolean;
}
