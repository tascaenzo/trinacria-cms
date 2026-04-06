import assert from "node:assert/strict";
import test from "node:test";
import type { PluginRuntimeStore } from "../src/contracts/plugin-runtime-store.js";
import type { PluginRuntimeRecord } from "../src/contracts/plugin-runtime.js";
import { EntityRegistry } from "../src/runtime/entity-registry.js";
import {
  DbPluginRuntimeStore,
  INSTALLED_PLUGINS_ENTITY,
  InMemoryPluginRuntimeStore,
} from "../src/runtime/plugin-runtime-store.js";
import { InMemoryPluginRuntime } from "../src/runtime/in-memory-plugin-runtime.js";
import type { DbAdapter, DbQuery, DbRepository } from "../src/contracts/db-adapter.js";

test("DbPluginRuntimeStore initializes entity registration and indexes", async () => {
  const entityRegistry = new EntityRegistry();
  const db = createDbAdapterDouble();
  const fixedDate = new Date("2026-03-04T10:00:00.000Z");

  const store = new DbPluginRuntimeStore({
    dbAdapter: db,
    entityRegistry,
    now: () => fixedDate,
  });

  await store.initialize();

  const entity = entityRegistry.get(INSTALLED_PLUGINS_ENTITY.entityName);
  assert.equal(entity.entityName, "installed_plugins");
  assert.deepEqual(db.ensureIndexesCalls, [
    {
      pluginId: "kernel",
      entityNames: ["installed_plugins"],
    },
  ]);
});

test("DbPluginRuntimeStore upserts and removes persisted records", async () => {
  const db = createDbAdapterDouble();
  const entityRegistry = new EntityRegistry();
  let tick = 0;

  const store = new DbPluginRuntimeStore({
    dbAdapter: db,
    entityRegistry,
    now: () => new Date(`2026-03-04T10:00:0${tick++}.000Z`),
  });

  const record = createRuntimeRecord("core-pack", "registered");
  await store.upsert(record);

  const loaded = await store.list();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0]?.pluginId, "core-pack");
  assert.equal(loaded[0]?.state, "registered");
  assert.equal(loaded[0]?.enabled, true);
  assert.equal(loaded[0]?.manifest.id, "core-pack");

  await store.upsert({
    ...record,
    state: "disabled",
    disabledReason: "maintenance",
    disabledAt: new Date("2026-03-04T10:01:00.000Z"),
    statusReason: {
      code: "plugin_disabled",
      message: "Plugin is disabled and cannot be loaded",
    },
  });

  const disabled = await store.list();
  assert.equal(disabled[0]?.state, "disabled");
  assert.equal(disabled[0]?.enabled, false);
  assert.equal(disabled[0]?.disabledReason, "maintenance");
  assert.equal(disabled[0]?.statusReason?.code, "plugin_disabled");

  await store.remove("core-pack");
  const afterDelete = await store.list();
  assert.equal(afterDelete.length, 0);
});

test("InMemoryPluginRuntime persists state transitions through runtime store", async () => {
  const calls: string[] = [];
  const store: PluginRuntimeStore = {
    async initialize() {
      calls.push("init");
    },
    async upsert(record) {
      calls.push(`upsert:${record.manifest.id}:${record.state}`);
    },
    async remove(pluginId) {
      calls.push(`remove:${pluginId}`);
    },
    async list() {
      return [];
    },
  };

  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    runtimeStore: store,
  });

  await runtime.register({
    id: "core-pack",
    version: "0.1.0",
    requiresCore: "^0.1.0",
  });
  await runtime.load("core-pack");
  await runtime.disable("core-pack", "manual");
  await runtime.unregister("core-pack");

  assert.deepEqual(calls, [
    "init",
    "upsert:core-pack:registered",
    "upsert:core-pack:loaded",
    "upsert:core-pack:unloaded",
    "upsert:core-pack:disabled",
    "remove:core-pack",
  ]);
});

test("InMemoryPluginRuntimeStore keeps latest persisted state", async () => {
  const store = new InMemoryPluginRuntimeStore(() =>
    new Date("2026-03-04T10:00:00.000Z"),
  );

  await store.initialize();
  await store.upsert(createRuntimeRecord("blog-pack", "registered"));
  await store.upsert(createRuntimeRecord("blog-pack", "loaded"));

  const records = await store.list();
  assert.equal(records.length, 1);
  assert.equal(records[0]?.pluginId, "blog-pack");
  assert.equal(records[0]?.state, "loaded");
});

test("InMemoryPluginRuntimeStore persists diagnostic error metadata", async () => {
  const store = new InMemoryPluginRuntimeStore(() =>
    new Date("2026-03-04T10:00:00.000Z"),
  );

  await store.initialize();
  await store.upsert({
    ...createRuntimeRecord("media-pack", "failed"),
    failedAt: new Date("2026-03-04T10:10:00.000Z"),
    lastFailurePhase: "init",
    lastError: Object.assign(new Error("boom"), {
      name: "PluginLifecycleError",
    }),
  });

  const [record] = await store.list();
  assert.equal(record?.lastErrorName, "PluginLifecycleError");
  assert.equal(record?.lastErrorMessage, "boom");
  assert.equal(record?.statusReason?.code, "plugin_failed");
});

function createRuntimeRecord(
  pluginId: string,
  state: PluginRuntimeRecord["state"],
): PluginRuntimeRecord {
  return {
    manifest: {
      id: pluginId,
      version: "0.1.0",
      requiresCore: "^0.1.0",
    },
    state,
    failureCount: 0,
    statusReason: {
      code: `plugin_${state}`,
      message: `Plugin is in state ${state}`,
    },
  };
}

function createDbAdapterDouble(): DbAdapter & {
  ensureIndexesCalls: Array<{ pluginId: string; entityNames: readonly string[] }>;
} {
  const registry = new Map<string, Array<Record<string, unknown>>>();
  const ensureIndexesCalls: Array<{ pluginId: string; entityNames: readonly string[] }> = [];
  let sequence = 0;

  const repository = <TData extends Record<string, unknown>>(
    namespace: string,
    entity: string,
  ): DbRepository<TData> => {
    const key = `${namespace}:${entity}`;
    const bucket = registry.get(key) ?? [];
    if (!registry.has(key)) {
      registry.set(key, bucket);
    }

    return {
      async findOne(query: DbQuery<TData>) {
        const found = bucket.find((item) => matchesFilter(item, query.filter)) ?? null;
        if (!found) return null;
        return query.parse ? query.parse(found) : (found as TData);
      },
      async findMany(query: DbQuery<TData>) {
        const filtered = bucket.filter((item) => matchesFilter(item, query.filter));
        const sorted = applySort(filtered, query.sort);
        return sorted.map((item) => (query.parse ? query.parse(item) : (item as TData)));
      },
      async insertOne(data: Partial<TData>) {
        sequence += 1;
        const record = {
          ...data,
          id: (data as Record<string, unknown>).id ?? `kernel:installed_plugins:${sequence}`,
        } as TData;
        bucket.push(record as Record<string, unknown>);
        return record;
      },
      async updateOne(query: DbQuery<TData>, patch: Partial<TData>) {
        const index = bucket.findIndex((item) => matchesFilter(item, query.filter));
        if (index < 0) return null;
        const next = {
          ...bucket[index],
          ...patch,
        } as TData;
        bucket[index] = next as Record<string, unknown>;
        return next;
      },
      async deleteOne(query: DbQuery<TData>) {
        const index = bucket.findIndex((item) => matchesFilter(item, query.filter));
        if (index < 0) return false;
        bucket.splice(index, 1);
        return true;
      },
    };
  };

  return {
    ensureIndexesCalls,
    repository(entityName, context) {
      return repository(context.pluginId, entityName);
    },
    async ensureIndexes(pluginId, entityNames) {
      ensureIndexesCalls.push({ pluginId, entityNames });
    },
    async beginTransaction() {
      return {
        async commit() {
          // no-op
        },
        async rollback() {
          // no-op
        },
      };
    },
    async healthCheck() {
      return { ok: true };
    },
  };
}

function matchesFilter(
  value: Record<string, unknown>,
  filter: Record<string, unknown> | undefined,
): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([key, expected]) => value[key] === expected);
}

function applySort<TData extends Record<string, unknown>>(
  values: readonly TData[],
  sort: Record<string, "asc" | "desc"> | undefined,
): TData[] {
  if (!sort || Object.keys(sort).length === 0) {
    return [...values];
  }

  const [field, direction] = Object.entries(sort)[0]!;
  return [...values].sort((left, right) => {
    const leftValue = String(left[field] ?? "");
    const rightValue = String(right[field] ?? "");
    if (leftValue === rightValue) return 0;
    if (direction === "asc") {
      return leftValue < rightValue ? -1 : 1;
    }
    return leftValue > rightValue ? -1 : 1;
  });
}
