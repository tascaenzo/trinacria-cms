import {
  CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
  CorePackAuthModule,
  CorePackSecurityModule
} from "@trinacria-cms/core-pack";
import {
  CORE_TOKENS,
  classProvider,
  defineModule,
  type EntityRegistry,
  factoryProvider,
  httpProvider,
  type ModuleDefinition
} from "@trinacria-cms/kernel";
import { ContentTypesController } from "./content-types.controller.js";
import { CONTENT_TYPES_ENTITY } from "./content-types.schemas.js";
import {
  CONTENT_TYPES_CONTROLLER_TOKEN,
  CONTENT_TYPES_ENTITY_REGISTRATION_TOKEN,
  CONTENT_TYPES_REPOSITORY_TOKEN,
  CONTENT_TYPES_SERVICE_TOKEN
} from "./content-types.tokens.js";
import { ContentTypesRepository } from "./repositories/content-types.repository.js";
import { ContentTypesService } from "./services/content-types.service.js";

export const EditorialContentTypesModule: ModuleDefinition = defineModule({
  name: "EditorialContentTypesModule",
  imports: [CorePackAuthModule, CorePackSecurityModule],
  providers: [
    factoryProvider(
      CONTENT_TYPES_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(CONTENT_TYPES_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(CONTENT_TYPES_REPOSITORY_TOKEN, ContentTypesRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(CONTENT_TYPES_SERVICE_TOKEN, ContentTypesService, [
      CONTENT_TYPES_REPOSITORY_TOKEN
    ]),
    httpProvider(CONTENT_TYPES_CONTROLLER_TOKEN, ContentTypesController, [
      CONTENT_TYPES_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
      CORE_TOKENS.AUTHZ_SERVICE
    ])
  ],
  exports: [
    CONTENT_TYPES_ENTITY_REGISTRATION_TOKEN,
    CONTENT_TYPES_REPOSITORY_TOKEN,
    CONTENT_TYPES_SERVICE_TOKEN,
    CONTENT_TYPES_CONTROLLER_TOKEN
  ]
});
