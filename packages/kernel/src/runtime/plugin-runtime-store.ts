import { s } from "@trinacria/schema";
import type { DbAdapter } from "../contracts/db-adapter.js";
import type {
  PersistedPluginRuntimeRecord,
  PluginRuntimeStore
} from "../contracts/plugin-runtime-store.js";
import type { PluginManifest } from "../contracts/plugin-manifest.js";
import type { PluginRuntimeDiagnostic, PluginRuntimeRecord } from "../contracts/plugin-runtime.js";
import { DbAdapterError } from "../errors/db-errors.js";
import { CoreError } from "../errors/core-error.js";
import { defineEntity, type EntityRegistry } from "./entity-registry.js";
import { validatePluginManifest } from "./plugin-manifest-validation.js";

const PluginRuntimeStateSchema = s.enum([
  "registered",
  "loading",
  "initializing",
  "loaded",
  "unloading",
  "failed",
  "disabled",
  "unloaded"
] as const);

const PluginLifecyclePhaseSchema = s.enum([
  "register",
  "dependency-check",
  "load",
  "init",
  "unload",
  "rollback"
] as const);

const PersistedPluginRuntimeRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    pluginId: s.string({ trim: true, minLength: 1 }),
    version: s.string({ trim: true, minLength: 1 }),
    state: PluginRuntimeStateSchema,
    enabled: s.boolean(),
    failureCount: s.number({ int: true, min: 0 }),
    lastFailurePhase: PluginLifecyclePhaseSchema.optional(),
    lastErrorCode: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    lastErrorName: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    lastErrorMessage: s.string({ trim: true, minLength: 1, maxLength: 2000 }).optional(),
    lastErrorDetails: s.object({}, { strict: false }).optional(),
    statusReason: s
      .object(
        {
          code: s.string({ trim: true, minLength: 1, maxLength: 120 }),
          message: s.string({ trim: true, minLength: 1, maxLength: 2000 })
        },
        { strict: false }
      )
      .optional(),
    disabledReason: s.string({ trim: true, minLength: 1, maxLength: 1000 }).optional(),
    manifest: s.object(
      {
        id: s.string({ trim: true, minLength: 1 }),
        version: s.string({ trim: true, minLength: 1 }),
        requiresCore: s.string({ trim: true, minLength: 1 })
      },
      { strict: false }
    ),
    loadedAt: s.dateTimeString().optional(),
    failedAt: s.dateTimeString().optional(),
    disabledAt: s.dateTimeString().optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: false }
);

/**
 * Canonical runtime persistence entity for installed plugins.
 */
export const INSTALLED_PLUGINS_ENTITY = defineEntity({
  entityName: "installed_plugins",
  schema: PersistedPluginRuntimeRecordSchema,
  indexes: [
    {
      fields: { id: 1 },
      unique: true,
      name: "installed_plugins_id_unique"
    },
    {
      fields: { pluginId: 1 },
      unique: true,
      name: "installed_plugins_plugin_id_unique"
    },
    {
      fields: { state: 1 },
      name: "installed_plugins_state_idx"
    },
    {
      fields: { enabled: 1 },
      name: "installed_plugins_enabled_idx"
    },
    {
      fields: { updatedAt: -1 },
      name: "installed_plugins_updated_at_desc_idx"
    }
  ] as const
});

const DEFAULT_RUNTIME_STORE_NAMESPACE = "kernel";

export interface DbPluginRuntimeStoreOptions {
  dbAdapter: DbAdapter;
  entityRegistry?: EntityRegistry;
  namespacePluginId?: string;
  now?: () => Date;
}

/**
 * In-memory runtime store useful for tests and no-DB deployments.
 */
export class InMemoryPluginRuntimeStore implements PluginRuntimeStore {
  private readonly records = new Map<string, PersistedPluginRuntimeRecord>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async initialize(): Promise<void> {
    // No setup required for in-memory storage.
  }

  async upsert(record: PluginRuntimeRecord): Promise<void> {
    const current = this.records.get(record.manifest.id);
    const nowIso = this.now().toISOString();
    const persisted = toPersistedRuntimeRecord(
      record,
      current?.createdAt ?? nowIso,
      nowIso,
      current?.id
    );
    this.records.set(record.manifest.id, persisted);
  }

  async remove(pluginId: string): Promise<void> {
    this.records.delete(pluginId);
  }

  async list(): Promise<readonly PersistedPluginRuntimeRecord[]> {
    return Array.from(this.records.values()).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }
}

/**
 * DbAdapter-backed runtime store.
 * It persists plugin runtime state in the `installed_plugins` entity.
 */
export class DbPluginRuntimeStore implements PluginRuntimeStore {
  private initialized = false;
  private readonly namespacePluginId: string;
  private readonly now: () => Date;

  constructor(private readonly options: DbPluginRuntimeStoreOptions) {
    this.namespacePluginId =
      options.namespacePluginId?.trim().toLowerCase() || DEFAULT_RUNTIME_STORE_NAMESPACE;
    this.now = options.now ?? (() => new Date());
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.options.entityRegistry?.register(INSTALLED_PLUGINS_ENTITY);

    if (supportsIndexSetup(this.options.dbAdapter)) {
      await this.options.dbAdapter.ensureIndexes(this.namespacePluginId, [
        INSTALLED_PLUGINS_ENTITY.entityName
      ]);
    }

    this.initialized = true;
  }

  async upsert(record: PluginRuntimeRecord): Promise<void> {
    await this.initialize();
    const repository = this.getRepository();
    const existing = await repository.findOne({
      filter: { pluginId: record.manifest.id },
      parse: (value) => parsePersistedRecord(value)
    });
    const nowIso = this.now().toISOString();
    const payload = toPersistedRuntimeRecord(
      record,
      existing?.createdAt ?? nowIso,
      nowIso,
      existing?.id
    );

    if (existing) {
      await repository.updateOne(
        { filter: { pluginId: record.manifest.id } },
        withRuntimeRecordUnsetFields(payload)
      );
      return;
    }

    await repository.insertOne(payload);
  }

  async remove(pluginId: string): Promise<void> {
    await this.initialize();
    const repository = this.getRepository();
    await repository.deleteOne({ filter: { pluginId } });
  }

  async list(): Promise<readonly PersistedPluginRuntimeRecord[]> {
    await this.initialize();
    const repository = this.getRepository();
    return repository.findMany({
      sort: { updatedAt: "desc" },
      parse: (value) => parsePersistedRecord(value)
    });
  }

  private getRepository() {
    return this.options.dbAdapter.repository<PersistedPluginRuntimeRecord>(
      INSTALLED_PLUGINS_ENTITY.entityName,
      { pluginId: this.namespacePluginId }
    );
  }
}

/**
 * Lazy wrapper that resolves the concrete store only when first used.
 */
export class DeferredPluginRuntimeStore implements PluginRuntimeStore {
  private resolvedStore?: PluginRuntimeStore;
  private loading?: Promise<PluginRuntimeStore>;

  constructor(private readonly factory: () => Promise<PluginRuntimeStore> | PluginRuntimeStore) {}

  async initialize(): Promise<void> {
    const store = await this.getStore();
    await store.initialize();
  }

  async upsert(record: PluginRuntimeRecord): Promise<void> {
    const store = await this.getStore();
    await store.upsert(record);
  }

  async remove(pluginId: string): Promise<void> {
    const store = await this.getStore();
    await store.remove(pluginId);
  }

  async list(): Promise<readonly PersistedPluginRuntimeRecord[]> {
    const store = await this.getStore();
    return store.list();
  }

  private async getStore(): Promise<PluginRuntimeStore> {
    if (this.resolvedStore) {
      return this.resolvedStore;
    }

    if (!this.loading) {
      this.loading = Promise.resolve(this.factory()).then((store) => {
        this.resolvedStore = store;
        return store;
      });
    }

    return this.loading;
  }
}

function toPersistedRuntimeRecord(
  record: PluginRuntimeRecord,
  createdAt: string,
  updatedAt: string,
  id?: string
): PersistedPluginRuntimeRecord {
  const persisted: PersistedPluginRuntimeRecord = {
    pluginId: record.manifest.id,
    version: record.manifest.version,
    state: record.state,
    enabled: record.state !== "disabled",
    failureCount: record.failureCount ?? 0,
    manifest: record.manifest,
    createdAt,
    updatedAt
  };

  if (id) {
    persisted.id = id;
  }
  if (record.lastFailurePhase) {
    persisted.lastFailurePhase = record.lastFailurePhase;
  }
  const diagnostic = toRuntimeDiagnostic(record.lastError);
  if (diagnostic?.code) {
    persisted.lastErrorCode = diagnostic.code;
  }
  if (diagnostic?.name) {
    persisted.lastErrorName = diagnostic.name;
  }
  if (diagnostic?.message) {
    persisted.lastErrorMessage = diagnostic.message;
  }
  if (diagnostic?.details) {
    persisted.lastErrorDetails = diagnostic.details;
  }
  if (record.statusReason) {
    persisted.statusReason = record.statusReason;
  }
  if (record.disabledReason) {
    persisted.disabledReason = record.disabledReason;
  }
  if (record.loadedAt) {
    persisted.loadedAt = record.loadedAt.toISOString();
  }
  if (record.failedAt) {
    persisted.failedAt = record.failedAt.toISOString();
  }
  if (record.disabledAt) {
    persisted.disabledAt = record.disabledAt.toISOString();
  }

  return persisted;
}

function withRuntimeRecordUnsetFields(
  payload: PersistedPluginRuntimeRecord
): Partial<PersistedPluginRuntimeRecord> {
  const update: Partial<PersistedPluginRuntimeRecord> = { ...payload };
  const optionalFields: Array<keyof PersistedPluginRuntimeRecord> = [
    "lastFailurePhase",
    "lastErrorCode",
    "lastErrorName",
    "lastErrorMessage",
    "lastErrorDetails",
    "statusReason",
    "disabledReason",
    "loadedAt",
    "failedAt",
    "disabledAt"
  ];

  for (const field of optionalFields) {
    if (!(field in update)) {
      update[field] = undefined;
    }
  }

  return update;
}

function supportsIndexSetup(adapter: DbAdapter): adapter is DbAdapter & {
  ensureIndexes(pluginId: string, entityNames: readonly string[]): Promise<void>;
} {
  const maybeAdapter = adapter as { ensureIndexes?: unknown };
  return typeof maybeAdapter.ensureIndexes === "function";
}

export function createInMemoryPluginRuntimeStore(): PluginRuntimeStore {
  return new InMemoryPluginRuntimeStore();
}

export function createDbPluginRuntimeStore(
  options: DbPluginRuntimeStoreOptions
): PluginRuntimeStore {
  return new DbPluginRuntimeStore(options);
}

export function createDeferredPluginRuntimeStore(
  factory: () => Promise<PluginRuntimeStore> | PluginRuntimeStore
): PluginRuntimeStore {
  return new DeferredPluginRuntimeStore(factory);
}

export function assertInstalledPluginRecordShape(value: unknown): PersistedPluginRuntimeRecord {
  try {
    return parsePersistedRecord(value);
  } catch (error) {
    throw new DbAdapterError("Invalid installed plugin runtime record shape", {
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

function parsePersistedRecord(value: unknown): PersistedPluginRuntimeRecord {
  const parsed = PersistedPluginRuntimeRecordSchema.parse(value);
  const record = parsed as Record<string, unknown>;
  const manifest = normalizePersistedManifest(record);

  return {
    ...(parsed as Omit<PersistedPluginRuntimeRecord, "manifest">),
    manifest
  };
}

function normalizePersistedManifest(record: Record<string, unknown>): PluginManifest {
  const rawManifest = record.manifest ?? record.manifestJson;
  if (typeof rawManifest === "string") {
    return validatePluginManifest(JSON.parse(rawManifest) as PluginManifest);
  }
  return validatePluginManifest(rawManifest as PluginManifest);
}

function toRuntimeDiagnostic(error: Error | undefined): PluginRuntimeDiagnostic | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof CoreError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      ...(error.details ? { details: error.details } : {})
    };
  }

  return {
    name: error.name,
    message: error.message
  };
}
