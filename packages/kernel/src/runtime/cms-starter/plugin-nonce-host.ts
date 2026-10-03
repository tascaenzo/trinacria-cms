import { factoryProvider, type TrinacriaApp } from "@trinacria/core";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";
import { MongoDbAdapter } from "../persistence/mongo-db-adapter.js";
import {
  MongoPluginNonceStore,
  PLUGIN_AUTH_NONCES_ENTITY
} from "../persistence/plugin-nonce-store.js";
export function registerPluginNonceHost(app: TrinacriaApp): void {
  if (!app.hasToken(CORE_TOKENS.DB_ADAPTER) || app.hasToken(CORE_TOKENS.PLUGIN_NONCE_STORE)) return;
  app.registerGlobalProvider(
    factoryProvider(CORE_TOKENS.PLUGIN_NONCE_STORE, async () => {
      const adapter = await app.resolve(CORE_TOKENS.DB_ADAPTER);
      if (!(await adapter.healthCheck()).ok)
        return {
          shared: false,
          async consume() {
            throw new Error("Shared nonce store unavailable");
          }
        };
      if (!(adapter instanceof MongoDbAdapter))
        throw new Error(
          "Signed plugin authentication requires a shared Mongo nonce store or explicit test/dev provider"
        );
      const registry = await app.resolve(CORE_TOKENS.ENTITY_REGISTRY);
      registry.register(PLUGIN_AUTH_NONCES_ENTITY);
      return new MongoPluginNonceStore(adapter);
    }, [])
  );
}
