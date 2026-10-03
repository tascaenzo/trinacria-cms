import {
  CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
  CorePackAuthModule,
  CorePackUsersModule,
  USERS_SERVICE_TOKEN
} from "@trinacria-cms/core-pack/runtime";
import {
  CORE_TOKENS,
  createToken,
  defineModule,
  factoryProvider,
  httpProvider,
  type ModuleDefinition
} from "@trinacria-cms/kernel";
import type { EntityRegistry } from "@trinacria-cms/kernel/runtime";
import { EDITORIAL_ENTRY_OPERATIONS } from "../../operations/editorial-entry-operations.js";
import { ContentTypesRepository } from "../content-types/repositories/content-types.repository.js";
import { EditorialEntriesModule } from "../entries/entries.module.js";
import {
  EDITORIAL_DELIVERY_SERVICE,
  EditorialPublicationsModule
} from "../publications/publications.module.js";
import { EditorialPreviewController } from "./preview.controller.js";
import { PREVIEW_CREDENTIALS_ENTITY } from "./preview.schemas.js";
import { EditorialPreviewService } from "./preview.service.js";
import { readPreviewConfig } from "./preview-config.js";

const registration = createToken<boolean>("EDITORIAL_PREVIEW_ENTITY");
const service = createToken<EditorialPreviewService>("EDITORIAL_PREVIEW_SERVICE");
const controller = createToken<EditorialPreviewController>("EDITORIAL_PREVIEW_HTTP");
export const EditorialPreviewModule: ModuleDefinition = defineModule({
  name: "EditorialPreviewModule",
  imports: [
    CorePackAuthModule,
    CorePackUsersModule,
    EditorialEntriesModule,
    EditorialPublicationsModule
  ],
  providers: [
    factoryProvider(
      registration,
      (registry) => {
        (registry as EntityRegistry).register(PREVIEW_CREDENTIALS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    factoryProvider(
      service,
      (db, users, entries, delivery) =>
        new EditorialPreviewService(
          db,
          readPreviewConfig(),
          users,
          entries,
          new ContentTypesRepository(db),
          delivery
        ),
      [
        CORE_TOKENS.DB_ADAPTER,
        USERS_SERVICE_TOKEN,
        EDITORIAL_ENTRY_OPERATIONS,
        EDITORIAL_DELIVERY_SERVICE
      ]
    ),
    httpProvider(controller, EditorialPreviewController, [
      service,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
      CORE_TOKENS.PUBLIC_REQUEST_LIMITER
    ])
  ],
  exports: [registration, controller]
});
