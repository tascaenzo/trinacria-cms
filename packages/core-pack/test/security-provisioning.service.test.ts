import assert from "node:assert/strict";
import test from "node:test";
import type {
  DbAdapter,
  DbQuery,
  DbRepository,
  NamespaceContext,
  PluginManifest
} from "@trinacria-cms/kernel";
import { PermissionsRepository } from "../src/modules/permissions/repositories/permissions.repository.js";
import { RoleGrantsRepository } from "../src/modules/roles/grants/role-grants.repository.js";
import { RolesRepository } from "../src/modules/roles/repositories/roles.repository.js";
import { CorePackManifestProvisioningService } from "../src/modules/security/services/security-provisioning.service.js";
import { RolePolicyRulesRepository } from "../src/modules/security/role-policy-rules/role-policy-rules.repository.js";
import { UserRolesRepository } from "../src/modules/security/user-access/user-roles.repository.js";
import { SettingsDefinitionsRepository } from "../src/modules/settings/definitions/settings-definitions.repository.js";
import { SettingsValuesRepository } from "../src/modules/settings/values/settings-values.repository.js";
import { SettingsSecretsRepository } from "../src/modules/settings/secrets/settings-secrets.repository.js";
import { SettingsSecretsCryptoService } from "../src/modules/settings/secrets/settings-secrets-crypto.service.js";
import { SettingsService } from "../src/modules/settings/services/settings.service.js";
import { I18nMessagesRepository } from "../src/modules/i18n/i18n-messages.repository.js";
import { I18nMessagesService } from "../src/modules/i18n/i18n-messages.service.js";
import { MemoryCacheAdapter } from "../src/modules/cache/adapters/memory-cache-adapter.js";
import { CacheService } from "../src/modules/cache/services/cache.service.js";
import { CORE_PACK_ADMIN_I18N, CORE_PACK_ADMIN_I18N_SOURCES } from "../src/admin-i18n/index.js";
import { CORE_PACK_MANIFEST } from "../src/plugin/core-pack.manifest.js";
import { CORE_PACK_READONLY_PERMISSION_KEY_LIST } from "../src/plugin/core-pack.security.js";

test("security provisioning syncs plugin-owned permissions, roles and grants", async () => {
  const db = createFakeDbAdapter();
  const roles = new RolesRepository(db);
  const grants = new RoleGrantsRepository(db);
  const rolePolicyRules = new RolePolicyRulesRepository(db);
  const permissions = new PermissionsRepository(db);
  const userRoles = new UserRolesRepository(db);
  const settings = createSettingsService(db);
  const service = new CorePackManifestProvisioningService(
    roles,
    grants,
    permissions,
    userRoles,
    settings
  );

  const pluginManifest: PluginManifest = {
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    security: {
      permissions: [
        { key: "blog-pack:posts:read", displayName: "Read posts" },
        { key: "blog-pack:posts:write", displayName: "Write posts" }
      ],
      roles: [{ code: "editor", name: "Editor" }],
      grants: [
        {
          roleCode: "editor",
          permissionKeys: ["blog-pack:posts:read", "blog-pack:posts:write"]
        }
      ],
      policyRules: [
        {
          roleCode: "editor",
          effect: "allow",
          permissionPattern: "blog-pack:posts:*"
        }
      ]
    }
  };

  await service.provision(pluginManifest);

  const editor = await roles.findByCode("editor");
  assert.ok(editor);
  assert.equal(editor.ownerPluginId, "blog-pack");

  const roleGrants = await grants.listByRoleCode("editor");
  assert.deepEqual(roleGrants.map((item) => item.permissionKey).sort(), [
    "blog-pack:posts:read",
    "blog-pack:posts:write"
  ]);

  const ownedPermissions = await permissions.listBySourcePlugin("blog-pack");
  assert.equal(ownedPermissions.length, 2);
  const provisionedPolicyRules = await rolePolicyRules.listBySourcePlugin("blog-pack");
  assert.equal(provisionedPolicyRules.length, 1);
  assert.equal(provisionedPolicyRules[0]?.permissionPattern, "blog-pack:posts:*");

  await service.provision({
    ...pluginManifest,
    security: {
      permissions: [{ key: "blog-pack:posts:read", displayName: "Read posts" }],
      roles: [{ code: "editor", name: "Editor" }],
      grants: [
        {
          roleCode: "editor",
          permissionKeys: ["blog-pack:posts:read"]
        }
      ],
      policyRules: []
    }
  });

  const syncedPermissions = await permissions.listBySourcePlugin("blog-pack");
  assert.deepEqual(
    syncedPermissions.map((item) => item.key),
    ["blog-pack:posts:read"]
  );
  const syncedGrants = await grants.listByRoleCode("editor");
  assert.deepEqual(
    syncedGrants.map((item) => item.permissionKey),
    ["blog-pack:posts:read"]
  );
  const syncedPolicyRules = await rolePolicyRules.listBySourcePlugin("blog-pack");
  assert.equal(syncedPolicyRules.length, 0);
});

test("core-pack manifest provisions admin, editor and viewer baseline roles", async () => {
  const db = createFakeDbAdapter();
  const roles = new RolesRepository(db);
  const grants = new RoleGrantsRepository(db);
  const rolePolicyRules = new RolePolicyRulesRepository(db);
  const permissions = new PermissionsRepository(db);
  const userRoles = new UserRolesRepository(db);
  const settings = createSettingsService(db);
  const translations = new I18nMessagesService(new I18nMessagesRepository(db));
  const service = new CorePackManifestProvisioningService(
    roles,
    grants,
    permissions,
    userRoles,
    settings,
    translations
  );

  await settings.upsertDefinition({
    requesterPluginId: "core-pack",
    key: "core-pack:features:editorial_workflow",
    defaultValue: false
  });
  await settings.upsertValue({
    requesterPluginId: "core-pack",
    key: "core-pack:features:editorial_workflow",
    value: true
  });

  await service.provision(CORE_PACK_MANIFEST, CORE_PACK_ADMIN_I18N_SOURCES);

  assert.equal(
    await settings.getDefinitionByKey("core-pack:features:editorial_workflow"),
    null
  );
  assert.equal(
    await settings.getResolvedValueByKey("core-pack:features:editorial_workflow"),
    null
  );

  const provisionedRoles = await roles.list();
  assert.deepEqual(provisionedRoles.map((role) => role.code).sort(), ["admin", "editor", "viewer"]);

  const adminGrants = await grants.listByRoleCode("admin");
  const editorGrants = await grants.listByRoleCode("editor");
  const viewerGrants = await grants.listByRoleCode("viewer");

  assert.equal(adminGrants.length > editorGrants.length, true);
  assert.deepEqual(
    editorGrants.map((grant) => grant.permissionKey).sort(),
    [...CORE_PACK_READONLY_PERMISSION_KEY_LIST].sort()
  );
  assert.deepEqual(
    viewerGrants.map((grant) => grant.permissionKey).sort(),
    [...CORE_PACK_READONLY_PERMISSION_KEY_LIST].sort()
  );
  assert.deepEqual(await translations.resolveLocale("en", "admin"), {
    locale: "en",
    fallbackLocale: "en",
    namespace: "admin",
    messages: CORE_PACK_ADMIN_I18N.en
  });
  assert.deepEqual(await translations.resolveLocale("it", "admin"), {
    locale: "it",
    fallbackLocale: "en",
    namespace: "admin",
    messages: CORE_PACK_ADMIN_I18N.it
  });
});

test("plugin provisioning imports granular translation messages and removes them on uninstall", async () => {
  const db = createFakeDbAdapter();
  const translations = new I18nMessagesService(new I18nMessagesRepository(db));
  const service = new CorePackManifestProvisioningService(
    new RolesRepository(db),
    new RoleGrantsRepository(db),
    new PermissionsRepository(db),
    new UserRolesRepository(db),
    createSettingsService(db),
    translations
  );
  const manifest: PluginManifest = {
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    i18n: {
      fallbackLocale: "en",
      namespaces: [
        { id: "public", surface: "public", locales: ["en", "it"], source: "public" },
        { id: "admin", surface: "admin", locales: ["en", "it"], source: "admin" }
      ]
    }
  };

  await service.provision(manifest, [
    { source: "public", locale: "en", messages: { "blog.title": "Blog", "blog.new": "New post" } },
    { source: "public", locale: "it", messages: { "blog.title": "Articoli" } },
    { source: "admin", locale: "en", messages: { "blog.manage": "Manage posts" } },
    { source: "admin", locale: "it", messages: { "blog.manage": "Gestisci articoli" } }
  ]);
  const repository = new I18nMessagesRepository(db);
  assert.deepEqual(
    (await repository.listByPlugin("blog-pack"))
      .map((message) => `${message.namespace}:${message.locale}:${message.key}`)
      .sort(),
    [
      "admin:en:blog.manage",
      "admin:it:blog.manage",
      "public:en:blog.new",
      "public:en:blog.title",
      "public:it:blog.title"
    ]
  );
  assert.deepEqual(await translations.resolveLocale("it", "public"), {
    locale: "it",
    fallbackLocale: "en",
    namespace: "public",
    messages: { "blog.title": "Articoli", "blog.new": "New post" }
  });
  assert.deepEqual(await translations.resolveLocale("it", undefined, "admin"), {
    locale: "it",
    fallbackLocale: "en",
    messages: { "blog.manage": "Gestisci articoli" }
  });

  await service.provision(
    { ...manifest, version: "1.0.1" },
    [
      { source: "public", locale: "en", messages: { "blog.title": "Posts" } },
      { source: "public", locale: "it", messages: { "blog.title": "Articoli" } },
      { source: "admin", locale: "en", messages: { "blog.manage": "Manage posts" } },
      { source: "admin", locale: "it", messages: { "blog.manage": "Gestisci articoli" } }
    ]
  );
  assert.deepEqual(await translations.resolveLocale("it", "public"), {
    locale: "it",
    fallbackLocale: "en",
    namespace: "public",
    messages: { "blog.title": "Articoli" }
  });
  assert.equal(
    (await repository.listByPlugin("blog-pack")).every((message) => message.sourceVersion === "1.0.1"),
    true
  );

  await service.deprovision(manifest);
  assert.equal((await repository.listByPlugin("blog-pack")).length, 0);
});

test("translation resolution uses cache and invalidates it after package asset synchronization", async () => {
  const db = createFakeDbAdapter();
  const adapter = new CountingMemoryCacheAdapter();
  const translations = new I18nMessagesService(
    new I18nMessagesRepository(db),
    new CacheService(adapter)
  );
  const manifest: PluginManifest = {
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    i18n: {
      fallbackLocale: "en",
      namespaces: [{ id: "public", surface: "public", locales: ["en", "it"], source: "public" }]
    }
  };

  await translations.syncManifest(manifest, [
    { source: "public", locale: "en", messages: { "blog.title": "Blog" } },
    { source: "public", locale: "it", messages: { "blog.title": "Articoli" } }
  ]);
  assert.equal((await translations.resolveLocale("it", undefined, "public")).messages["blog.title"], "Articoli");
  assert.equal((await translations.resolveLocale("it", undefined, "public")).messages["blog.title"], "Articoli");
  assert.equal(adapter.setCalls, 1);

  await translations.syncManifest(
    { ...manifest, version: "1.0.1" },
    [
      { source: "public", locale: "en", messages: { "blog.title": "Blog" } },
      { source: "public", locale: "it", messages: { "blog.title": "Articoli aggiornati" } }
    ]
  );
  assert.equal(
    (await translations.resolveLocale("it", undefined, "public")).messages["blog.title"],
    "Articoli aggiornati"
  );
  assert.equal(adapter.setCalls, 2);
});

test("deprovision keeps role as disabled when foreign plugin grants still exist", async () => {
  const db = createFakeDbAdapter();
  const roles = new RolesRepository(db);
  const grants = new RoleGrantsRepository(db);
  const rolePolicyRules = new RolePolicyRulesRepository(db);
  const permissions = new PermissionsRepository(db);
  const userRoles = new UserRolesRepository(db);
  const settings = createSettingsService(db);
  const service = new CorePackManifestProvisioningService(
    roles,
    grants,
    permissions,
    userRoles,
    settings
  );

  await service.provision({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    security: {
      permissions: [{ key: "blog-pack:posts:read", displayName: "Read posts" }],
      roles: [{ code: "editor", name: "Editor" }],
      grants: [
        {
          roleCode: "editor",
          permissionKeys: ["blog-pack:posts:read"]
        }
      ]
    }
  });

  await service.provision({
    id: "shop-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    security: {
      permissions: [{ key: "shop-pack:catalog:read", displayName: "Read catalog" }],
      grants: [
        {
          roleCode: "editor",
          permissionKeys: ["shop-pack:catalog:read"]
        }
      ]
    }
  });

  await service.deprovision({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });

  const editor = await roles.findByCode("editor");
  assert.ok(editor);
  assert.equal(editor.status, "disabled");

  const blogPermissions = await permissions.listBySourcePlugin("blog-pack");
  assert.equal(blogPermissions.length, 0);
});

class CountingMemoryCacheAdapter extends MemoryCacheAdapter {
  setCalls = 0;

  override async set<T>(namespace: string, key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.setCalls += 1;
    await super.set(namespace, key, value, ttlSeconds);
  }
}

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

function createSettingsService(db: DbAdapter): SettingsService {
  return new SettingsService(
    new SettingsDefinitionsRepository(db),
    new SettingsValuesRepository(db),
    new SettingsSecretsRepository(db),
    new SettingsSecretsCryptoService()
  );
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
