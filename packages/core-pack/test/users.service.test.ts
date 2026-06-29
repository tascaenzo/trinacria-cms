import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository, NamespaceContext } from "@trinacria-cms/kernel";
import type { EventBus } from "@trinacria/events";
import {
  CORE_PACK_USER_CREATED_EVENT,
  CORE_PACK_USER_PROFILE_UPDATED_EVENT,
  CORE_PACK_USER_STATUS_CHANGED_EVENT
} from "../src/modules/users/users.events.js";
import { UsersRepository } from "../src/modules/users/repositories/users.repository.js";
import { UsersService } from "../src/modules/users/services/users.service.js";

test("UsersService creates and fetches users", async () => {
  const db = createFakeDbAdapter();
  const service = new UsersService(new UsersRepository(db));

  const created = await service.createUser({
    email: "Alice@example.com",
    firstName: "Alice",
    lastName: "Smith"
  });

  assert.equal(created.email, "alice@example.com");
  assert.equal(created.firstName, "Alice");
  assert.equal(created.lastName, "Smith");
  assert.equal(created.status, "active");
  assert.equal(typeof created.id, "string");

  const fetched = await service.getUserById(created.id);
  assert.equal(fetched?.id, created.id);
});

test("UsersService prevents duplicate email in plugin namespace", async () => {
  const db = createFakeDbAdapter();
  const service = new UsersService(new UsersRepository(db));

  await service.createUser({
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Smith"
  });

  await assert.rejects(
    async () =>
      service.createUser({
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Johnson"
      }),
    /already exists/
  );
});

test("UsersService updates user status and lists users", async () => {
  const db = createFakeDbAdapter();
  const service = new UsersService(new UsersRepository(db));

  const first = await service.createUser({
    email: "a@example.com",
    firstName: "A",
    lastName: "One"
  });
  await service.createUser({
    email: "b@example.com",
    firstName: "B",
    lastName: "Two"
  });

  const suspended = await service.suspendUser(first.id);
  assert.equal(suspended?.status, "suspended");

  const users = await service.listUsers();
  assert.equal(users.length, 2);
});

test("UsersService updates profile and status together", async () => {
  const db = createFakeDbAdapter();
  const service = new UsersService(new UsersRepository(db));

  const created = await service.createUser({
    email: "status@example.com",
    firstName: "Status",
    lastName: "User"
  });

  const updated = await service.updateUserProfile(created.id, {
    firstName: "Updated",
    lastName: "User",
    status: "suspended"
  });

  assert.equal(updated?.firstName, "Updated");
  assert.equal(updated?.lastName, "User");
  assert.equal(updated?.status, "suspended");
});

test("UsersService emits non-sensitive lifecycle events", async () => {
  const db = createFakeDbAdapter();
  const events = createRecordingEventBus();
  const service = new UsersService(new UsersRepository(db), events.bus);

  const created = await service.createUser({
    email: "events@example.com",
    firstName: "Events",
    lastName: "User"
  });
  await service.updateUserProfile(created.id, {
    firstName: "Updated",
    lastName: "User",
    status: "active"
  });
  await service.suspendUser(created.id);

  assert.deepEqual(events.records, [
    {
      event: CORE_PACK_USER_CREATED_EVENT,
      payload: {
        userId: created.id,
        status: "active",
        source: "admin"
      }
    },
    {
      event: CORE_PACK_USER_PROFILE_UPDATED_EVENT,
      payload: {
        userId: created.id,
        changedFields: ["firstName"]
      }
    },
    {
      event: CORE_PACK_USER_STATUS_CHANGED_EVENT,
      payload: {
        userId: created.id,
        previousStatus: "active",
        status: "suspended",
        reason: "admin"
      }
    }
  ]);
});

function createFakeDbAdapter(): DbAdapter {
  const buckets = new Map<string, Array<Record<string, unknown>>>();
  let sequence = 0;

  const getBucket = (key: string) => {
    const existing = buckets.get(key);
    if (existing) return existing;
    const created: Array<Record<string, unknown>> = [];
    buckets.set(key, created);
    return created;
  };

  const repository = <TData extends Record<string, unknown>>(key: string): DbRepository<TData> => ({
    async findOne(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const found = bucket.find((item) => matchesFilter(item, query.filter)) ?? null;
      if (!found) return null;
      return query.parse ? query.parse(found) : found;
    },
    async findMany(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const filtered = bucket.filter((item) => matchesFilter(item, query.filter));
      const sliced = filtered.slice(
        query.offset ?? 0,
        (query.offset ?? 0) + (query.limit ?? filtered.length)
      );
      return sliced.map((item) => (query.parse ? query.parse(item) : item));
    },
    async insertOne(data: Partial<TData>) {
      const bucket = getBucket(key) as TData[];
      const record = { ...data } as TData & { id?: string };
      if (!record.id) {
        sequence += 1;
        record.id = `${key}:${sequence}`;
      }
      bucket.push(record);
      return record;
    },
    async updateOne(query: DbQuery<TData>, patch: Partial<TData>) {
      const bucket = getBucket(key) as TData[];
      const index = bucket.findIndex((item) => matchesFilter(item, query.filter));
      if (index < 0) return null;
      const updated = {
        ...bucket[index],
        ...patch
      } as TData;
      bucket[index] = updated;
      return updated;
    },
    async deleteOne(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const index = bucket.findIndex((item) => matchesFilter(item, query.filter));
      if (index < 0) return false;
      bucket.splice(index, 1);
      return true;
    }
  });

  return {
    repository<TData>(entityName: string, context: NamespaceContext): DbRepository<TData> {
      return repository(`${context.pluginId}:${entityName}`) as unknown as DbRepository<TData>;
    },
    async beginTransaction() {
      return {
        async commit() {},
        async rollback() {}
      };
    },
    async healthCheck() {
      return { ok: true };
    }
  };
}

function createRecordingEventBus(): {
  bus: EventBus;
  records: Array<{ event: string; payload: unknown }>;
} {
  const records: Array<{ event: string; payload: unknown }> = [];
  return {
    records,
    bus: {
      async emit(event, payload) {
        records.push({ event, payload });
      },
      on() {
        return () => {};
      },
      once() {
        return () => {};
      },
      off() {},
      listenerCount() {
        return 0;
      }
    }
  };
}

function matchesFilter(
  item: Record<string, unknown>,
  filter: Record<string, unknown> | undefined
): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([key, value]) => item[key] === value);
}
