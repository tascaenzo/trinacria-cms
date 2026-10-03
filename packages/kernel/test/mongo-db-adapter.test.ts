import assert from "node:assert/strict";
import test from "node:test";
import { s } from "@trinacria/schema";
import { DbAdapterError } from "../src/errors/index.js";
import { createMongoDbAdapter, EntityRegistry, InMemoryStorageOwnershipStore, buildPhysicalCollectionName } from "../src/runtime/index.js";

test("MongoDbAdapter maps namespace to collection and resolves query options", async () => {
  const connection = createFakeConnection();
  const registry = new EntityRegistry();
  registry.register({ ownerPluginId: "cms/content",
    entityName: "content_entries",
    schema: s.object({ title: s.string() })
  });

  const adapter = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(),
    connection,
    entityRegistry: registry
  });

  const repository = adapter.repository<{ title: string }>("content_entries", {
    pluginId: "cms/content"
  });

  const items = await repository.findMany({
    filter: { status: "published" },
    sort: { createdAt: "desc" },
    offset: 5,
    limit: 10,
    parse: (value) => value as { title: string }
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "hello");
  assert.equal(connection.lastCollectionName, buildPhysicalCollectionName({ pluginId: "cms/content" }, "content_entries"));
  assert.deepEqual(connection.queryLog.at(-1), {
    kind: "find",
    filter: { status: "published" },
    options: { readPreference: "primary" },
    sort: { createdAt: -1 },
    skip: 5,
    limit: 10
  });
});

test("MongoDbAdapter supports insert/update/delete", async () => {
  const connection = createFakeConnection();
  const registry = new EntityRegistry();
  registry.register({ ownerPluginId: "cms/settings",
    entityName: "settings",
    schema: s.object({ key: s.string(), value: s.string() })
  });

  const adapter = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(),
    connection,
    entityRegistry: registry
  });

  const repository = adapter.repository<{ key: string; value: string }>("settings", {
    pluginId: "cms/settings"
  });

  const created = await repository.insertOne({ key: "theme", value: "light" });
  assert.equal(created.value, "light");
  assert.equal(typeof (created as { id?: unknown }).id, "string");

  const updated = await repository.updateOne({ filter: { key: "theme" } }, { value: "dark" });
  assert.equal(updated?.value, "dark");

  const deleted = await repository.deleteOne({ filter: { key: "theme" } });
  assert.equal(deleted, true);
});

test("MongoDbAdapter preserves a domain value field in direct findOneAndUpdate results", async () => {
  const connection = createFakeConnection({ directFindOneAndUpdateResult: true });
  const registry = new EntityRegistry();
  registry.register({ ownerPluginId: "core-pack",
    entityName: "settings",
    schema: s.object({ key: s.string(), value: s.string() })
  });
  const adapter = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(), connection, entityRegistry: registry });
  const repository = adapter.repository<{ key: string; value: string }>("settings", {
    pluginId: "core-pack"
  });

  const updated = await repository.updateOne({ filter: { key: "theme" } }, { value: "dark" });

  assert.equal(updated?.key, "theme");
  assert.equal(updated?.value, "dark");
});

test("EntityRegistry throws when entity is missing", () => {
  const adapter = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(),
    connection: createFakeConnection(),
    entityRegistry: new EntityRegistry()
  });

  assert.throws(
    () =>
      adapter.repository("missing_entity", {
        pluginId: "cms/content"
      }),
    DbAdapterError
  );
});

test("MongoDbAdapter healthCheck and transactions are available", async () => {
  const connection = createFakeConnection();
  const registry = new EntityRegistry();
  registry.register({ ownerPluginId: "cms/jobs",
    entityName: "jobs",
    schema: s.object({ id: s.string() })
  });

  const adapter = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(),
    connection,
    entityRegistry: registry
  });

  const health = await adapter.healthCheck();
  assert.deepEqual(health, { ok: true });
  assert.deepEqual(connection.commandLog, [{ ping: 1 }]);

  const tx = await adapter.beginTransaction({ pluginId: "cms/jobs" });
  await tx.commit();
  assert.equal(connection.sessionLog.includes("start"), true);
  assert.equal(connection.sessionLog.includes("commit"), true);
});

test("MongoDbAdapter healthCheck reports a failed Mongo ping", async () => {
  const adapter = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(),
    connection: createFakeConnection({ pingError: new Error("mongo unavailable") }),
    entityRegistry: new EntityRegistry()
  });

  assert.deepEqual(await adapter.healthCheck(), {
    ok: false,
    reason: "mongo unavailable"
  });
});

test("MongoDbAdapter ensureIndexes uses canonical index declarations", async () => {
  const connection = createFakeConnection();
  const registry = new EntityRegistry();
  registry.register({ ownerPluginId: "core-pack",
    entityName: "users",
    schema: s.object({ email: s.string({ email: true }) }),
    indexes: [
      {
        fields: { pluginId: 1, email: 1 },
        unique: true,
        name: "users_plugin_email_unique"
      }
    ]
  });

  const adapter = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(),
    connection,
    entityRegistry: registry
  });

  await adapter.ensureIndexes("core-pack", ["users"]);
  assert.deepEqual(connection.indexCalls, [
    {
      collection: buildPhysicalCollectionName({ pluginId: "core-pack" }, "users"),
      indexes: [
        {
          key: { pluginId: 1, email: 1 },
          unique: true,
          name: "users_plugin_email_unique"
        }
      ]
    }
  ]);
});

test("MongoDbAdapter maps reserved kernel namespace without plugin prefix", async () => {
  const connection = createFakeConnection();
  const registry = new EntityRegistry();
  registry.register({ ownerPluginId: "kernel",
    entityName: "installed_plugins",
    schema: s.object({ pluginId: s.string() })
  });

  const adapter = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(),
    connection,
    entityRegistry: registry
  });

  const repository = adapter.repository<{ pluginId: string }>("installed_plugins", {
    pluginId: "kernel"
  });

  await repository.findOne({
    filter: { pluginId: "core-pack" },
    parse: (value) => value as { pluginId: string }
  });

  assert.equal(connection.lastCollectionName, buildPhysicalCollectionName({ pluginId: "kernel" }, "installed_plugins"));
});

function createFakeConnection(options?: {
  pingError?: Error;
  directFindOneAndUpdateResult?: boolean;
}) {
  const queryLog: Array<Record<string, unknown>> = [];
  const sessionLog: string[] = [];
  const commandLog: Array<Record<string, unknown>> = [];
  const indexCalls: Array<{ collection: string; indexes: unknown[] }> = [];
  let stored: Record<string, unknown> = { _id: "seed-1", key: "theme", value: "light" };
  let lastCollectionName = "";
  let idCounter = 1;

  const connection = {
    queryLog,
    sessionLog,
    commandLog,
    indexCalls,
    db: {
      async command(command: Record<string, unknown>) {
        commandLog.push(command);
        if (options?.pingError) throw options.pingError;
        return { ok: 1 };
      }
    },
    get lastCollectionName() {
      return lastCollectionName;
    },
    collection(name: string) {
      lastCollectionName = name;
      return {
        async findOne(_filter?: Record<string, unknown>, _options?: Record<string, unknown>) {
          return { ...(stored as Record<string, unknown>) };
        },
        find(filter?: Record<string, unknown>, options?: Record<string, unknown>) {
          const trace: Record<string, unknown> = {
            kind: "find",
            filter,
            options
          };
          return {
            sort(sortValue: Record<string, 1 | -1>) {
              trace.sort = sortValue;
              return this;
            },
            skip(skip: number) {
              trace.skip = skip;
              return this;
            },
            limit(limit: number) {
              trace.limit = limit;
              return this;
            },
            async toArray() {
              queryLog.push(trace);
              return [{ title: "hello" }];
            }
          };
        },
        async insertOne(document: Record<string, unknown>) {
          idCounter += 1;
          const insertedId = `mongo-${idCounter}`;
          stored = { _id: insertedId, ...document };
          return { insertedId };
        },
        async findOneAndUpdate(_filter: Record<string, unknown>, patch: Record<string, unknown>) {
          stored = applyMongoPatch(stored, patch);
          const updated = { ...(stored as Record<string, unknown>) };
          return options?.directFindOneAndUpdateResult ? updated : { value: updated };
        },
        async updateOne(filter: Record<string, unknown>, patch: Record<string, unknown>) {
          if (filter._id && stored._id === filter._id) {
            stored = applyMongoPatch(stored, patch);
          }
          return {};
        },
        async deleteOne() {
          return { deletedCount: 1 };
        },
        async createIndexes(indexes: unknown[]) {
          indexCalls.push({ collection: name, indexes });
          return {};
        }
      };
    },
    async startSession() {
      sessionLog.push("start");
      return {
        async withTransaction<T>(work: () => Promise<T>) {
          sessionLog.push("begin");
          try { const result = await work(); sessionLog.push("commit"); return result; }
          catch (error) { sessionLog.push("abort"); throw error; }
        },
        startTransaction() {
          sessionLog.push("begin");
        },
        async commitTransaction() {
          sessionLog.push("commit");
        },
        async abortTransaction() {
          sessionLog.push("abort");
        },
        async endSession() {
          sessionLog.push("end");
        }
      };
    }
  };

  return connection;
}

function applyMongoPatch(
  current: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  if (
    "$set" in patch &&
    patch.$set &&
    typeof patch.$set === "object" &&
    !Array.isArray(patch.$set)
  ) {
    const next = {
      ...current,
      ...(patch.$set as Record<string, unknown>)
    };
    if (
      "$unset" in patch &&
      patch.$unset &&
      typeof patch.$unset === "object" &&
      !Array.isArray(patch.$unset)
    ) {
      for (const key of Object.keys(patch.$unset as Record<string, unknown>)) {
        delete next[key];
      }
    }
    return next;
  }
  return {
    ...current,
    ...patch
  };
}


test("MongoDbAdapter carries partial filters and safely replaces legacy sparse indexes", async () => {
  const connection = createFakeConnection();
  const original = connection.collection.bind(connection);
  const lifecycle: string[] = [];
  const registry = new EntityRegistry();
  registry.register({ ownerPluginId: "editorial-pack", entityName: "entries", schema: s.object({ id: s.string() }), indexes: [{
    fields: { contentTypeId: 1, slug: 1 }, unique: true, partialFilter: { slug: { $type: "string" } }, name: "partial_slug"
  }] });
  const adapter = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(), connection: {
    ...connection,
    collection(name: string) {
      const records = original(name);
      return { ...records,
        createIndexes: async (indexes: unknown[]) => { lifecycle.push("create"); return records.createIndexes(indexes); },
        indexes: async () => [{ name: "old_sparse_slug", key: { contentTypeId: 1 as const, slug: 1 as const }, unique: true, sparse: true }],
        dropIndex: async (name: string) => { lifecycle.push(`drop:${name}`); }
      };
    }
  }, entityRegistry: registry });
  await adapter.ensureIndexes("editorial-pack", ["entries"]);
  assert.deepEqual(connection.indexCalls[0]?.indexes, [{ key: { contentTypeId: 1, slug: 1 }, unique: true, partialFilterExpression: { slug: { $type: "string" } }, name: "partial_slug" }]);
  assert.deepEqual(lifecycle, ["create", "drop:old_sparse_slug"]);
});

test("MongoDbAdapter scopes all transaction queries to one session and cleans up", async () => {
  const connection = createFakeConnection();
  const registry = new EntityRegistry();
  registry.register({ ownerPluginId: "editorial-pack", entityName: "entries", schema: s.object({ id: s.string() }) });
  const db = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(), connection, entityRegistry: registry });
  const value = await db.withTransaction({ pluginId: "editorial-pack" }, async (scoped) => {
    await scoped.repository("entries", { pluginId: "editorial-pack" }).findMany({});
    await scoped.repository("entries", { pluginId: "editorial-pack" }).findMany({});
    assert.throws(() => scoped.repository("entries", { pluginId: "other-pack" }), /namespace/);
    return 42;
  });
  assert.equal(value, 42);
  const first = connection.queryLog[0]?.options as { session?: unknown };
  const second = connection.queryLog[1]?.options as { session?: unknown };
  assert.ok(first.session);
  assert.equal(first.session, second.session);
  assert.deepEqual(connection.sessionLog, ["start", "begin", "commit", "end"]);
  await assert.rejects(db.withTransaction({ pluginId: "editorial-pack" }, async () => { throw new Error("injected"); }), /injected/);
  assert.deepEqual(connection.sessionLog.slice(-4), ["start", "begin", "abort", "end"]);
});

test("host transaction retries invalidate repositories from earlier attempts", async () => {
  const connection = createFakeConnection();
  const originalSession = await connection.startSession();
  connection.startSession = async () => ({ ...originalSession, async withTransaction(work) {
    await work(); await work(); return undefined;
  } });
  const registry = new EntityRegistry();
  registry.register({ ownerPluginId: "host-test", entityName: "items", schema: s.object({ id: s.string() }) });
  const db = createMongoDbAdapter({ ownershipStore: new InMemoryStorageOwnershipStore(), connection, entityRegistry: registry });
  let previous: ReturnType<typeof db.repository> | undefined;
  let attempts = 0;
  const result = await db.runHostTransaction([{ pluginId: "host-test" }], async (repositories) => {
    attempts++;
    if (previous) await assert.rejects(previous.findMany({}), /scope has ended/);
    previous = repositories.repository("items", { pluginId: "host-test" });
    await previous.findMany({});
    return attempts;
  });
  assert.equal(result, 2);
  await assert.rejects(previous!.findMany({}), /scope has ended/);
});

test("storage rechecks legacy collections after reconnect and before indexes", async () => {
  const connection = createFakeConnection();
  let initialized = 0;
  const store = new InMemoryStorageOwnershipStore();
  store.initialize = async () => { initialized++; };
  const db = createMongoDbAdapter({ ownershipStore: store, connection, entityRegistry: new EntityRegistry() });
  await db.initializeStorageOwnership();
  assert.equal(initialized, 1);
  connection.db = { async command() { return { cursor: { firstBatch: [{ name: "plugin_old__items" }] } }; } } as typeof connection.db;
  await assert.rejects(db.initializeStorageOwnership(), /No data was changed/);
  assert.equal(initialized, 1);
});
