import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository, NamespaceContext } from "@trinacria-cms/kernel";
import { RolesRepository } from "../src/modules/roles/repositories/roles.repository.js";
import { RolePolicyRulesRepository } from "../src/modules/security/role-policy-rules/role-policy-rules.repository.js";
import { RolePolicyRulesService } from "../src/modules/security/role-policy-rules/role-policy-rules.service.js";

test("RolePolicyRulesService supports CRUD by role code", async () => {
  const db = createFakeDbAdapter();
  const roles = new RolesRepository(db);
  const rulesRepo = new RolePolicyRulesRepository(db);
  const service = new RolePolicyRulesService(roles, rulesRepo);

  await roles.upsertOwnedRole({
    code: "editor",
    name: "Editor",
    ownerPluginId: "core-pack"
  });

  const created = await service.create("editor", {
    effect: "allow",
    permissionPattern: "core-pack:users:*",
    conditions: ["resource_id_required"]
  });
  assert.ok(created);
  assert.equal(created.permissionPattern, "core-pack:users:*");

  const list = await service.listByRoleCode("editor");
  assert.equal(list?.length, 1);

  const updated = await service.update("editor", created!.id, {
    effect: "deny",
    permissionPattern: "core-pack:users:delete",
    conditions: []
  });
  assert.ok(updated);
  assert.equal(updated?.effect, "deny");

  const deleted = await service.delete("editor", updated!.id);
  assert.equal(deleted, true);

  const emptyList = await service.listByRoleCode("editor");
  assert.equal(emptyList?.length, 0);
});

test("RolePolicyRulesService rejects create for missing role", async () => {
  const db = createFakeDbAdapter();
  const roles = new RolesRepository(db);
  const rulesRepo = new RolePolicyRulesRepository(db);
  const service = new RolePolicyRulesService(roles, rulesRepo);

  const created = await service.create("missing-role", {
    effect: "allow",
    permissionPattern: "core-pack:users:*"
  });
  assert.equal(created, null);
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
      const sorted = applySort(filtered, query.sort);
      const offset = query.offset ?? 0;
      const limit = query.limit ?? sorted.length;
      const sliced = sorted.slice(offset, offset + limit);
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

function applySort<TData extends Record<string, unknown>>(
  values: readonly TData[],
  sort: Record<string, "asc" | "desc"> | undefined
): TData[] {
  if (!sort || Object.keys(sort).length === 0) return [...values];
  const [field, direction] = Object.entries(sort)[0];
  return [...values].sort((a, b) => {
    const aValue = String(a[field] ?? "");
    const bValue = String(b[field] ?? "");
    if (aValue === bValue) return 0;
    if (direction === "asc") {
      return aValue < bValue ? -1 : 1;
    }
    return aValue > bValue ? -1 : 1;
  });
}
