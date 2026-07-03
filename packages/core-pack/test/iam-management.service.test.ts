import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository, NamespaceContext } from "@trinacria-cms/kernel";
import { PermissionsRepository } from "../src/modules/permissions/repositories/permissions.repository.js";
import { PermissionsService } from "../src/modules/permissions/services/permissions.service.js";
import { RoleGrantsRepository } from "../src/modules/roles/grants/role-grants.repository.js";
import { RolesRepository } from "../src/modules/roles/repositories/roles.repository.js";
import { RolesService } from "../src/modules/roles/services/roles.service.js";

test("RolesService updates status through the main role update flow", async () => {
  const db = createFakeDbAdapter();
  const service = new RolesService(new RolesRepository(db), new RoleGrantsRepository(db));
  const created = await service.createRole({
    code: "editor",
    name: "Editor"
  });

  const updated = await service.updateRole(created.id, {
    name: "Editor",
    status: "disabled"
  });

  assert.equal(updated?.status, "disabled");
});

test("PermissionsService keeps core-pack default permissions read-only", async () => {
  const db = createFakeDbAdapter();
  const repository = new PermissionsRepository(db);
  const service = new PermissionsService(repository);
  const permission = await repository.upsertOwnedPermission({
    key: "core-pack:users:read",
    displayName: "Read users",
    sourcePluginId: "core-pack"
  });

  await assert.rejects(
    () =>
      service.updatePermission(permission.id, {
        displayName: "Read users",
        status: "disabled"
      }),
    /read-only/
  );
  await assert.rejects(() => service.disablePermission(permission.id), /read-only/);
});

test("PermissionsService updates custom permission status through the main update flow", async () => {
  const db = createFakeDbAdapter();
  const service = new PermissionsService(new PermissionsRepository(db));
  const created = await service.createPermission({
    key: "core-pack:custom:read",
    displayName: "Read custom"
  });

  const updated = await service.updatePermission(created.id, {
    displayName: "Read custom",
    status: "disabled"
  });

  assert.equal(updated?.status, "disabled");
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

function matchesFilter(
  item: Record<string, unknown>,
  filter: Record<string, unknown> | undefined
): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([key, value]) => item[key] === value);
}
