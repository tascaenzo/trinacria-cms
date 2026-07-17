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
  CorePackSecurityModule,
  CORE_PACK_JWT_AUTH_SERVICE_TOKEN
} from "@trinacria-cms/core-pack";
import { EditorialContentTypesModule } from "../content-types/content-types.module.js";
import { CONTENT_TYPES_SERVICE_TOKEN } from "../content-types/content-types.tokens.js";
import { EntriesController } from "./entries.controller.js";
import { ENTRIES_ENTITY } from "./entries.schemas.js";
import { EntriesRepository } from "./repositories/entries.repository.js";
import { EntriesService } from "./services/entries.service.js";
import { ENTRY_REVISIONS_ENTITY } from "../revisions/revisions.schemas.js";
import { EntryRevisionsRepository } from "../revisions/repositories/entry-revisions.repository.js";
import {
  ENTRY_REVISIONS_ENTITY_REGISTRATION_TOKEN,
  ENTRY_REVISIONS_REPOSITORY_TOKEN
} from "../revisions/revisions.tokens.js";
import { REVIEW_ASSIGNMENTS_ENTITY } from "../reviews/review-assignments.schemas.js";
import { ReviewAssignmentsRepository } from "../reviews/review-assignments.repository.js";
import { ReviewAssignmentsService } from "../reviews/review-assignments.service.js";
import {
  REVIEW_ASSIGNMENTS_ENTITY_REGISTRATION_TOKEN,
  REVIEW_ASSIGNMENTS_REPOSITORY_TOKEN,
  REVIEW_ASSIGNMENTS_SERVICE_TOKEN
} from "../reviews/review-assignments.tokens.js";
import {
  ENTRIES_CONTROLLER_TOKEN,
  ENTRIES_ENTITY_REGISTRATION_TOKEN,
  ENTRIES_REPOSITORY_TOKEN,
  ENTRIES_SERVICE_TOKEN
} from "./entries.tokens.js";

export const EditorialEntriesModule: ModuleDefinition = defineModule({
  name: "EditorialEntriesModule",
  imports: [CorePackAuthModule, CorePackSecurityModule, EditorialContentTypesModule],
  providers: [
    factoryProvider(
      ENTRIES_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(ENTRIES_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    factoryProvider(
      ENTRY_REVISIONS_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(ENTRY_REVISIONS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    factoryProvider(
      REVIEW_ASSIGNMENTS_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(REVIEW_ASSIGNMENTS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(ENTRIES_REPOSITORY_TOKEN, EntriesRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(ENTRY_REVISIONS_REPOSITORY_TOKEN, EntryRevisionsRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(REVIEW_ASSIGNMENTS_REPOSITORY_TOKEN, ReviewAssignmentsRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(REVIEW_ASSIGNMENTS_SERVICE_TOKEN, ReviewAssignmentsService, [
      REVIEW_ASSIGNMENTS_REPOSITORY_TOKEN,
      ENTRIES_REPOSITORY_TOKEN
    ]),
    classProvider(ENTRIES_SERVICE_TOKEN, EntriesService, [
      ENTRIES_REPOSITORY_TOKEN,
      CONTENT_TYPES_SERVICE_TOKEN,
      ENTRY_REVISIONS_REPOSITORY_TOKEN
    ]),
    httpProvider(ENTRIES_CONTROLLER_TOKEN, EntriesController, [
      ENTRIES_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
      CORE_TOKENS.AUTHZ_SERVICE
    ])
  ],
  exports: [
    ENTRIES_ENTITY_REGISTRATION_TOKEN,
    ENTRY_REVISIONS_ENTITY_REGISTRATION_TOKEN,
    ENTRIES_REPOSITORY_TOKEN,
    ENTRY_REVISIONS_REPOSITORY_TOKEN,
    REVIEW_ASSIGNMENTS_ENTITY_REGISTRATION_TOKEN,
    REVIEW_ASSIGNMENTS_REPOSITORY_TOKEN,
    REVIEW_ASSIGNMENTS_SERVICE_TOKEN,
    ENTRIES_SERVICE_TOKEN,
    ENTRIES_CONTROLLER_TOKEN
  ]
});
