import {
  classProvider,
  CORE_TOKENS,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry
} from "@trinacria-cms/kernel";
import { I18nBundlesRepository } from "./i18n-bundles.repository.js";
import { I18nBundlesService } from "./i18n-bundles.service.js";
import { I18nController } from "./i18n.controller.js";
import { I18N_BUNDLES_ENTITY } from "./i18n.schemas.js";
import {
  I18N_BUNDLES_ENTITY_REGISTRATION_TOKEN,
  I18N_BUNDLES_REPOSITORY_TOKEN,
  I18N_BUNDLES_SERVICE_TOKEN,
  I18N_CONTROLLER_TOKEN
} from "./i18n.tokens.js";

export const CorePackI18nModule = defineModule({
  name: "CorePackI18nModule",
  providers: [
    factoryProvider(
      I18N_BUNDLES_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(I18N_BUNDLES_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(I18N_BUNDLES_REPOSITORY_TOKEN, I18nBundlesRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(I18N_BUNDLES_SERVICE_TOKEN, I18nBundlesService, [I18N_BUNDLES_REPOSITORY_TOKEN]),
    httpProvider(I18N_CONTROLLER_TOKEN, I18nController, [I18N_BUNDLES_SERVICE_TOKEN])
  ],
  exports: [
    I18N_CONTROLLER_TOKEN,
    I18N_BUNDLES_SERVICE_TOKEN,
    I18N_BUNDLES_REPOSITORY_TOKEN
  ]
});
