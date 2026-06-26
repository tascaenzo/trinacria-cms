import { classProvider, CORE_TOKENS, defineModule, factoryProvider } from "@trinacria-cms/kernel";
import { createDefaultCacheAdapter } from "./cache-adapter-factory.js";
import { CacheService } from "./cache.service.js";
import { CORE_PACK_CACHE_ADAPTER_TOKEN, CORE_PACK_CACHE_SERVICE_TOKEN } from "./cache.tokens.js";
import { CorePackRuntimeConfigModule } from "../settings/config/runtime-config.module.js";
import { RUNTIME_CONFIG_SERVICE_TOKEN } from "../settings/settings.tokens.js";

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
