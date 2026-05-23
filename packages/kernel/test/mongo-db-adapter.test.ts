import assert from "node:assert/strict";
import test from "node:test";
import { s } from "@trinacria/schema";
import { DbAdapterError } from "../src/errors/index.js";
import { createMongoDbAdapter, EntityRegistry } from "../src/runtime/index.js";

test("MongoDbAdapter maps namespace to collection and resolves query options", async () => {
  const connection = createFakeConnection();
  const registry = new EntityRegistry();
  registry.register({
    entityName: "content_entries",
    schema: s.object({ title: s.string() })
  });

  const adapter = createMongoDbAdapter({
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
  assert.equal(connection.lastCollectionName, "plugin_cms_content__content_entries");
  assert.deepEqual(connection.queryLog.at(-1), {
    kind: "find",
    filter: { status: "published" },
    options: {},
    sort: { createdAt: -1 },
    skip: 5,
    limit: 10
  });
});

test("MongoDbAdapter supports insert/update/delete", async () => {
  const connection = createFakeConnection();
  const registry = new EntityRegistry();
  registry.register({
    entityName: "settings",
    schema: s.object({ key: s.string(), value: s.string() })
  });

  const adapter = createMongoDbAdapter({
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

test("EntityRegistry throws when entity is missing", () => {
  const adapter = createMongoDbAdapter({
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
  registry.register({
    entityName: "jobs",
    schema: s.object({ id: s.string() })
  });

  const adapter = createMongoDbAdapter({
    connection,
    entityRegistry: registry
  });

  const health = await adapter.healthCheck();
  assert.deepEqual(health, { ok: true });

  const tx = await adapter.beginTransaction({ pluginId: "cms/jobs" });
  await tx.commit();
  assert.equal(connection.sessionLog.includes("start"), true);
  assert.equal(connection.sessionLog.includes("commit"), true);
});

test("MongoDbAdapter ensureIndexes uses canonical index declarations", async () => {
  const connection = createFakeConnection();
  const registry = new EntityRegistry();
  registry.register({
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

  const adapter = createMongoDbAdapter({
    connection,
    entityRegistry: registry
  });

  await adapter.ensureIndexes("core-pack", ["users"]);
  assert.deepEqual(connection.indexCalls, [
    {
      collection: "plugin_core_pack__users",
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
  registry.register({
    entityName: "installed_plugins",
    schema: s.object({ pluginId: s.string() })
  });

  const adapter = createMongoDbAdapter({
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

  assert.equal(connection.lastCollectionName, "kernel__installed_plugins");
});

function createFakeConnection() {
  const queryLog: Array<Record<string, unknown>> = [];
  const sessionLog: string[] = [];
  const indexCalls: Array<{ collection: string; indexes: unknown[] }> = [];
  let stored: Record<string, unknown> = { _id: "seed-1", key: "theme", value: "light" };
  let lastCollectionName = "";
  let idCounter = 1;

  const connection = {
    queryLog,
    sessionLog,
    indexCalls,
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
          return { value: { ...(stored as Record<string, unknown>) } };
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
