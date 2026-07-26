import {
  classProvider,
  CORE_TOKENS,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry,
  type ModuleDefinition
} from "@trinacria-cms/kernel";
import {
  CorePackAuthModule,
  CorePackSettingsModule,
  CorePackSecurityModule,
  CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
  SETTINGS_SERVICE_TOKEN
} from "@trinacria-cms/core-pack";
import { EditorialContentTypesModule } from "../content-types/content-types.module.js";
import { CONTENT_TYPES_SERVICE_TOKEN } from "../content-types/content-types.tokens.js";
import { EntriesController } from "./entries.controller.js";
import { ENTRIES_ENTITY } from "./entries.schemas.js";
import { EntriesRepository } from "./repositories/entries.repository.js";
import { EntriesService } from "./services/entries.service.js";
import { ENTRY_REVISIONS_ENTITY } from "../revisions/revisions.schemas.js";
import { RevisionsRepository } from "../revisions/revisions.repository.js";
import { REVISIONS_REPOSITORY_TOKEN } from "../revisions/revisions.tokens.js";
import {
  ENTRIES_CONTROLLER_TOKEN,
  ENTRIES_ENTITY_REGISTRATION_TOKEN,
  ENTRIES_REPOSITORY_TOKEN,
  ENTRIES_SERVICE_TOKEN
} from "./entries.tokens.js";

export const EditorialEntriesModule: ModuleDefinition = defineModule({
  name: "EditorialEntriesModule",
  imports: [CorePackAuthModule, CorePackSecurityModule, CorePackSettingsModule, EditorialContentTypesModule],
  providers: [
    factoryProvider(
      ENTRIES_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(ENTRIES_ENTITY);
        (registry as EntityRegistry).register(ENTRY_REVISIONS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(ENTRIES_REPOSITORY_TOKEN, EntriesRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(REVISIONS_REPOSITORY_TOKEN, RevisionsRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(ENTRIES_SERVICE_TOKEN, EntriesService, [
      ENTRIES_REPOSITORY_TOKEN,
      CONTENT_TYPES_SERVICE_TOKEN,
      REVISIONS_REPOSITORY_TOKEN,
      SETTINGS_SERVICE_TOKEN
    ]),
    httpProvider(ENTRIES_CONTROLLER_TOKEN, EntriesController, [
      ENTRIES_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
      CORE_TOKENS.AUTHZ_SERVICE
    ])
  ],
  exports: [
    ENTRIES_ENTITY_REGISTRATION_TOKEN,
    ENTRIES_REPOSITORY_TOKEN,
    REVISIONS_REPOSITORY_TOKEN,
    ENTRIES_SERVICE_TOKEN,
    ENTRIES_CONTROLLER_TOKEN
  ]
});
