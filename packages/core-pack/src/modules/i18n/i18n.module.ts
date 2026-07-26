import {
  CORE_TOKENS,
  classProvider,
  defineModule,
  type EntityRegistry,
  factoryProvider,
  httpProvider
} from "@trinacria-cms/kernel";
import { CorePackCacheModule } from "../cache/cache.module.js";
import { CORE_PACK_CACHE_SERVICE_TOKEN } from "../cache/cache.tokens.js";
import { I18nController } from "./i18n.controller.js";
import { I18nMessagesRepository } from "./i18n-messages.repository.js";
import { I18N_MESSAGES_ENTITY } from "./i18n-messages.schemas.js";
import { I18nMessagesService } from "./i18n-messages.service.js";
import {
  I18N_CONTROLLER_TOKEN,
  I18N_MESSAGES_ENTITY_REGISTRATION_TOKEN,
  I18N_MESSAGES_REPOSITORY_TOKEN,
  I18N_MESSAGES_SERVICE_TOKEN
} from "./i18n-messages.tokens.js";

export const CorePackI18nModule = defineModule({
  name: "CorePackI18nModule",
  imports: [CorePackCacheModule],
  providers: [
    factoryProvider(
      I18N_MESSAGES_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(I18N_MESSAGES_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(I18N_MESSAGES_REPOSITORY_TOKEN, I18nMessagesRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(I18N_MESSAGES_SERVICE_TOKEN, I18nMessagesService, [
      I18N_MESSAGES_REPOSITORY_TOKEN,
      CORE_PACK_CACHE_SERVICE_TOKEN
    ]),
    httpProvider(I18N_CONTROLLER_TOKEN, I18nController, [I18N_MESSAGES_SERVICE_TOKEN])
  ],
  exports: [I18N_CONTROLLER_TOKEN, I18N_MESSAGES_SERVICE_TOKEN, I18N_MESSAGES_REPOSITORY_TOKEN]
});
