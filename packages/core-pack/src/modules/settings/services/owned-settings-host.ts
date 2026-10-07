import type { DbAdapter, PluginRuntime } from "@trinacria-cms/kernel";
import type { PluginSettingsHost } from "@trinacria-cms/kernel/contracts";
import { HostUnitOfWork, MongoDbAdapter } from "@trinacria-cms/kernel/runtime";
import { assertRequesterOwnsSettingKey } from "../_shared/settings-key.js";
import { SettingsDefinitionsRepository } from "../definitions/settings-definitions.repository.js";
import { SettingsSecretsRepository } from "../secrets/settings-secrets.repository.js";
import { SettingsValuesRepository } from "../values/settings-values.repository.js";
import type { SettingsService } from "./settings.service.js";
/** The owner's declared, nonsecret settings are a scoped host capability, not a cross-plugin API grant. */
export function createOwnedSettingsHost(
  service: SettingsService,
  db: DbAdapter,
  runtime: {
    list(): ReturnType<PluginRuntime["list"]> | Promise<ReturnType<PluginRuntime["list"]>>;
  }
): PluginSettingsHost {
  const assertOwned = async (pluginId: string, key: string, write = false) => {
    assertRequesterOwnsSettingKey(pluginId, key, write ? "write value" : "read value");
    const owner = (await runtime.list()).find((record) => record.manifest.id === pluginId);
    const definition = owner?.manifest.settings?.find((setting) => setting.key === key);
    if (
      !owner ||
      !["loading", "initializing", "loaded"].includes(owner.state) ||
      !definition ||
      definition.secret ||
      (write && definition.mutable === false)
    )
      throw new Error("Owned nonsecret active setting required");
  };
  return {
    async get(pluginId, key) {
      await assertOwned(pluginId, key);
      const value = await service.getResolvedValueForPlugin(pluginId, key);
      await assertOwned(pluginId, key);
      return value?.value ?? null;
    },
    async set(pluginId, key, value) {
      await assertOwned(pluginId, key, true);
      if (!(db instanceof MongoDbAdapter))
        throw new Error("Owned setting writes require transactional host storage");
      await new HostUnitOfWork(db).run(
        [
          { pluginId: "core-pack" },
          ...(pluginId === "core-pack" ? [] : [{ pluginId }]),
          { pluginId: "kernel" }
        ],
        async (repositories) => {
          const adapter: DbAdapter = {
            repository: (name, namespace) => {
              if (namespace.pluginId !== "core-pack")
                throw new Error("Owned settings storage boundary");
              return repositories.repository(name, namespace);
            },
            healthCheck: () => db.healthCheck(),
            async beginTransaction() {
              throw new Error("Nested owned setting transaction");
            }
          };
          const scoped = service.forRepositories(
            new SettingsDefinitionsRepository(adapter),
            new SettingsValuesRepository(adapter),
            new SettingsSecretsRepository(adapter)
          );
          await scoped.upsertValue({
            requesterPluginId: pluginId,
            key,
            value,
            updatedBy: `plugin:${pluginId}`
          });
          await assertOwned(pluginId, key, true);
        }
      );
    }
  };
}
