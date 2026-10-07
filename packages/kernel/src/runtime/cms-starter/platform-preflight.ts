import { randomUUID } from "node:crypto";
import type { TrinacriaApp } from "@trinacria/core";
import type { CmsStarterOptions } from "../../contracts/cms-starter.js";
import type { KernelPluginDefinition } from "../../contracts/plugin-runtime.js";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";
import { PluginMigrationRunner } from "../migrations/migration-runner.js";
import { PLATFORM_ENTITIES, registerPlatformEntities } from "../migrations/platform-storage.js";
import { HostUnitOfWork } from "../persistence/host-unit-of-work.js";
import { MongoDbAdapter } from "../persistence/mongo-db-adapter.js";

export function createPlatformPreflight(app: TrinacriaApp, options: CmsStarterOptions) {
  const instanceId = options.migrations?.instanceId ?? randomUUID();
  let initialized: Promise<MongoDbAdapter | null> | undefined;
  async function initialize(): Promise<MongoDbAdapter | null> {
    if (!app.hasToken(CORE_TOKENS.DB_ADAPTER)) return null;
    const adapter = await app.resolve(CORE_TOKENS.DB_ADAPTER);
    if (!(adapter instanceof MongoDbAdapter)) return null;
    const health = await adapter.healthCheck();
    if (!health.ok) {
      if (options.migrations?.allowStartupWithoutDb) return null;
      throw new Error("Migration preflight requires a connected Mongo replica set");
    }
    const registry = await app.resolve(CORE_TOKENS.ENTITY_REGISTRY);
    registerPlatformEntities(registry);
    await adapter.ensureIndexes(
      "kernel",
      PLATFORM_ENTITIES.map((entity) => entity.entityName)
    );
    await new HostUnitOfWork(adapter).run(
      [{ pluginId: "kernel" }],
      async (repositories) => {
        await repositories
          .repository("platform_locks", { pluginId: "kernel" })
          .findOne({ filter: { id: "transaction-preflight" } });
      },
      { bypassMaintenance: true }
    );
    const runner = new PluginMigrationRunner(adapter, { instanceId, packageRoot: process.cwd() });
    adapter.setWriteGuard(async (repositories, namespaces) => {
      await runner.maintenance.fence(repositories, namespaces);
      if (app.hasToken(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR))
        await (await app.resolve(CORE_TOKENS.PLUGIN_CLUSTER_COORDINATOR)).fenceWrites(
          repositories,
          namespaces
        );
    });
    return adapter;
  }
  return async (definition: KernelPluginDefinition) => {
    initialized ??= initialize();
    let adapter: MongoDbAdapter | null;
    try {
      adapter = await initialized;
    } catch (error) {
      initialized = undefined;
      throw error;
    }
    if (!adapter) {
      initialized = undefined;
      return;
    }
    const packageRoot = options.migrations?.packageRoots?.[definition.manifest.id];
    if (definition.manifest.migrations?.length && !packageRoot)
      throw new Error(
        "Distributed migration package root must be explicitly configured by the host"
      );
    const runner = new PluginMigrationRunner(adapter, {
      instanceId,
      packageRoot: packageRoot ?? process.cwd()
    });
    if (definition.manifest.migrations?.length)
      await runner.verifyAppliedIntegrity(definition.manifest, definition.migrations ?? []);
    await runner.assertSchemaCompatible(definition.manifest);
    if (definition.manifest.migrations?.length)
      await runner.verifyAppliedIntegrity(
        definition.manifest,
        definition.migrations ?? [],
        { pluginId: definition.manifest.id },
        true
      );
  };
}
