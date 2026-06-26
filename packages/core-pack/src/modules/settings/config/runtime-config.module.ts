import { CORE_TOKENS, defineModule, factoryProvider } from "@trinacria-cms/kernel";
import { RUNTIME_CONFIG_SERVICE_TOKEN } from "../settings.tokens.js";
import { RuntimeConfigService } from "./runtime-config.service.js";

export const CorePackRuntimeConfigModule = defineModule({
  name: "CorePackRuntimeConfigModule",
  providers: [
    factoryProvider(RUNTIME_CONFIG_SERVICE_TOKEN, (db) => new RuntimeConfigService(db), [
      CORE_TOKENS.DB_ADAPTER
    ])
  ],
  exports: [RUNTIME_CONFIG_SERVICE_TOKEN]
});
