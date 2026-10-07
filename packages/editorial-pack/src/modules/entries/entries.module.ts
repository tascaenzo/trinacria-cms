import {
  CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
  CorePackAuthModule,
  CorePackSecurityModule,
  CorePackSettingsModule,
  SETTINGS_SERVICE_TOKEN
} from "@trinacria-cms/core-pack/runtime";
import {
  CORE_TOKENS,
  classProvider,
  defineModule,
  factoryProvider,
  httpProvider,
  type ModuleDefinition
} from "@trinacria-cms/kernel";
import type { EntityRegistry } from "@trinacria-cms/kernel/runtime";
import {
  MEDIA_ASSETS_SERVICE_TOKEN,
  MediaPackMediaModule
} from "@trinacria-cms/media-pack/runtime";
import {
  EDITORIAL_ENTRY_OPERATIONS,
  EditorialEntryOperations
} from "../../operations/editorial-entry-operations.js";
import { EditorialContentTypesModule } from "../content-types/content-types.module.js";
import { CONTENT_TYPES_SERVICE_TOKEN } from "../content-types/content-types.tokens.js";
import {
  PUBLICATION_POINTERS_ENTITY,
  PUBLICATION_SNAPSHOTS_ENTITY
} from "../publications/publications.schemas.js";
import { RevisionsRepository } from "../revisions/revisions.repository.js";
import { ENTRY_REVISIONS_ENTITY } from "../revisions/revisions.schemas.js";
import { REVISIONS_REPOSITORY_TOKEN } from "../revisions/revisions.tokens.js";
import { EntriesController } from "./entries.controller.js";
import { ENTRIES_ENTITY } from "./entries.schemas.js";
import {
  ENTRIES_CONTROLLER_TOKEN,
  ENTRIES_ENTITY_REGISTRATION_TOKEN,
  ENTRIES_REPOSITORY_TOKEN,
  ENTRIES_SERVICE_TOKEN
} from "./entries.tokens.js";
import { EntriesRepository } from "./repositories/entries.repository.js";
import { EntriesService } from "./services/entries.service.js";

export const EditorialEntriesModule: ModuleDefinition = defineModule({
  name: "EditorialEntriesModule",
  imports: [
    CorePackAuthModule,
    CorePackSecurityModule,
    CorePackSettingsModule,
    EditorialContentTypesModule,
    MediaPackMediaModule
  ],
  providers: [
    factoryProvider(
      ENTRIES_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(ENTRIES_ENTITY);
        (registry as EntityRegistry).register(ENTRY_REVISIONS_ENTITY);
        (registry as EntityRegistry).register(PUBLICATION_SNAPSHOTS_ENTITY);
        (registry as EntityRegistry).register(PUBLICATION_POINTERS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(ENTRIES_REPOSITORY_TOKEN, EntriesRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(REVISIONS_REPOSITORY_TOKEN, RevisionsRepository, [CORE_TOKENS.DB_ADAPTER]),
    factoryProvider(
      ENTRIES_SERVICE_TOKEN,
      (r, c, v, settings, db, durable, media) =>
        new EntriesService(r, c, v, settings, db, undefined, false, durable, undefined, media),
      [
        ENTRIES_REPOSITORY_TOKEN,
        CONTENT_TYPES_SERVICE_TOKEN,
        REVISIONS_REPOSITORY_TOKEN,
        SETTINGS_SERVICE_TOKEN,
        CORE_TOKENS.DB_ADAPTER,
        CORE_TOKENS.DURABLE_EVENTS,
        MEDIA_ASSETS_SERVICE_TOKEN
      ]
    ),
    classProvider(EDITORIAL_ENTRY_OPERATIONS, EditorialEntryOperations, [
      ENTRIES_SERVICE_TOKEN,
      CORE_TOKENS.OPERATION_AUTHORIZER
    ]),
    httpProvider(ENTRIES_CONTROLLER_TOKEN, EntriesController, [
      EDITORIAL_ENTRY_OPERATIONS,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN
    ])
  ],
  exports: [
    EDITORIAL_ENTRY_OPERATIONS,
    ENTRIES_ENTITY_REGISTRATION_TOKEN,
    ENTRIES_REPOSITORY_TOKEN,
    REVISIONS_REPOSITORY_TOKEN,
    ENTRIES_SERVICE_TOKEN,
    ENTRIES_CONTROLLER_TOKEN
  ]
});
