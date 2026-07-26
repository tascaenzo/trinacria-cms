import { CORE_TOKENS, classProvider, defineModule, factoryProvider } from "@trinacria-cms/kernel";
import { CorePackRuntimeConfigModule } from "../settings/config/runtime-config.module.js";
import { RUNTIME_CONFIG_SERVICE_TOKEN } from "../settings/settings.tokens.js";
import { CORE_PACK_CACHE_ADAPTER_TOKEN, CORE_PACK_CACHE_SERVICE_TOKEN } from "./cache.tokens.js";
import { createDefaultCacheAdapter } from "./cache-adapter-factory.js";
import { CacheService } from "./services/cache.service.js";

export const CorePackCacheModule = defineModule({
  name: "CorePackCacheModule",
  imports: [CorePackRuntimeConfigModule],
  providers: [
    factoryProvider(CORE_PACK_CACHE_ADAPTER_TOKEN, createDefaultCacheAdapter, [
      CORE_TOKENS.DB_ADAPTER,
      RUNTIME_CONFIG_SERVICE_TOKEN
    ]),
    classProvider(CORE_PACK_CACHE_SERVICE_TOKEN, CacheService, [CORE_PACK_CACHE_ADAPTER_TOKEN])
  ],
  exports: [CORE_PACK_CACHE_ADAPTER_TOKEN, CORE_PACK_CACHE_SERVICE_TOKEN]
});
