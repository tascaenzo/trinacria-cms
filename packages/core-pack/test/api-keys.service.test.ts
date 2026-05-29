import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository, NamespaceContext } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../src/plugin/core-pack.constants.js";
import { PermissionsRepository } from "../src/modules/permissions/permissions.repository.js";
import { RoleGrantsRepository } from "../src/modules/roles/grants/role-grants.repository.js";
import { RolesRepository } from "../src/modules/roles/roles.repository.js";
import { RolePolicyRulesRepository } from "../src/modules/security/role-policy-rules/role-policy-rules.repository.js";
import { ApiKeyHashingService } from "../src/modules/security/api-keys/api-key-hashing.service.js";
import { ApiKeysRepository } from "../src/modules/security/api-keys/api-keys.repository.js";
import { ApiKeysService } from "../src/modules/security/api-keys/api-keys.service.js";

test("ApiKeysService issues keys, authenticates them and resolves embedded authorization rules", async () => {
  const db = createFakeDbAdapter();
  const permissions = new PermissionsRepository(db);
  const roles = new RolesRepository(db);
  const roleGrants = new RoleGrantsRepository(db);
  const rolePolicyRules = new RolePolicyRulesRepository(db);
  const apiKeys = new ApiKeysRepository(db);
  const hashing = new ApiKeyHashingService();
  const service = new ApiKeysService(
    apiKeys,
    hashing,
    roles,
    roleGrants,
    rolePolicyRules,
    permissions
  );

  await permissions.upsertOwnedPermission({
    key: "core-pack:users:read",
    displayName: "Read users",
    sourcePluginId: CORE_PACK_PLUGIN_ID
  });
  await permissions.upsertOwnedPermission({
    key: "core-pack:roles:read",
    displayName: "Read roles",
    sourcePluginId: CORE_PACK_PLUGIN_ID
  });
  await roles.upsertOwnedRole({
    code: "integrator",
    name: "Integrator",
    ownerPluginId: CORE_PACK_PLUGIN_ID
  });
  await roleGrants.upsert({
    roleCode: "integrator",
    permissionKey: "core-pack:users:read",
    sourcePluginId: CORE_PACK_PLUGIN_ID
  });
  await rolePolicyRules.upsert({
    roleCode: "integrator",
    effect: "allow",
    permissionPattern: "core-pack:users:*",
    sourcePluginId: CORE_PACK_PLUGIN_ID
  });

  const created = await service.create({
    name: "Backoffice integration",
    kind: "service",
    roleCodes: ["integrator"],
    permissionKeys: ["core-pack:roles:read"],
    policyRules: [
      {
        effect: "deny",
        permissionPattern: "core-pack:users:delete",
        conditions: []
      }
    ]
  });

  assert.match(created.apiKey, /^cms_sk_[a-z0-9]+_[A-Za-z0-9_-]+$/);
  assert.equal(created.record.kind, "service");
  assert.deepEqual(created.record.roleCodes, ["integrator"]);

  const authenticated = await service.authenticate(created.apiKey);
  assert.match(authenticated.subjectId, /^api-key:/);
  assert.equal(authenticated.record.id, created.record.id);

  const persisted = await service.getById(created.record.id);
  assert.ok(persisted?.lastUsedAt);

  const rules = await service.resolveAuthorizationRules(created.record.id);
  assert.ok(
    rules.some(
      (rule) => rule.effect === "allow" && rule.permissionPattern === "core-pack:roles:read"
    )
  );
  assert.ok(
    rules.some(
      (rule) => rule.effect === "allow" && rule.permissionPattern === "core-pack:users:read"
    )
  );
  assert.ok(
    rules.some((rule) => rule.effect === "allow" && rule.permissionPattern === "core-pack:users:*")
  );
  assert.ok(
    rules.some(
      (rule) => rule.effect === "deny" && rule.permissionPattern === "core-pack:users:delete"
    )
  );
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
      const updated = { ...bucket[index], ...patch } as TData;
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
