import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository } from "@trinacria-cms/kernel";
import { UsersRepository } from "../src/modules/users/users.repository.js";
import { UsersService } from "../src/modules/users/users.service.js";

test("UsersService creates and fetches users", async () => {
  const db = createFakeDbAdapter();
  const service = new UsersService(new UsersRepository(db));

  const created = await service.createUser({
    email: "Alice@example.com",
    displayName: "Alice Smith",
  });

  assert.equal(created.email, "alice@example.com");
  assert.equal(created.displayName, "Alice Smith");
  assert.equal(created.status, "active");
  assert.equal(typeof created.id, "string");

  const fetched = await service.getUserById(created.id);
  assert.equal(fetched?.id, created.id);
});

test("UsersService prevents duplicate email in plugin namespace", async () => {
  const db = createFakeDbAdapter();
  const service = new UsersService(new UsersRepository(db));

  await service.createUser(
    {
      email: "alice@example.com",
      displayName: "Alice Smith",
    },
  );

  await assert.rejects(
    async () =>
      service.createUser(
        {
          email: "alice@example.com",
          displayName: "Alice Johnson",
        },
      ),
    /already exists/,
  );
});

test("UsersService updates user status and lists users", async () => {
  const db = createFakeDbAdapter();
  const service = new UsersService(new UsersRepository(db));

  const first = await service.createUser({
    email: "a@example.com",
    displayName: "A One",
  });
  await service.createUser({
    email: "b@example.com",
    displayName: "B Two",
  });

  const suspended = await service.suspendUser(first.id);
  assert.equal(suspended?.status, "suspended");

  const users = await service.listUsers();
  assert.equal(users.length, 2);
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

  const repository = <TData extends Record<string, unknown>>(
    key: string,
  ): DbRepository<TData> => ({
    async findOne(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const found =
        bucket.find((item) => matchesFilter(item, query.filter)) ?? null;
      if (!found) return null;
      return query.parse ? query.parse(found) : found;
    },
    async findMany(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const filtered = bucket.filter((item) => matchesFilter(item, query.filter));
      const sliced = filtered.slice(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? filtered.length));
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
        ...patch,
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
    },
  });

  return {
    repository(entityName, context) {
      return repository(`${context.pluginId}:${entityName}`);
    },
    async beginTransaction() {
      return {
        async commit() {},
        async rollback() {},
      };
    },
    async healthCheck() {
      return { ok: true };
    },
  };
}

function matchesFilter(
  item: Record<string, unknown>,
  filter: Record<string, unknown> | undefined,
): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([key, value]) => item[key] === value);
}
