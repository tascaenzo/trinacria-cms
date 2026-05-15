import {
  classProvider,
  CORE_TOKENS,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry
} from "@trinacria-cms/kernel";
import { CorePackAuthModule } from "../auth/auth.module.js";
import { CORE_PACK_JWT_AUTH_SERVICE_TOKEN } from "../auth/auth.tokens.js";
import { PermissionsController } from "./permissions.controller.js";
import { PERMISSIONS_ENTITY } from "./permissions.schemas.js";
import { PermissionsRepository } from "./permissions.repository.js";
import { PermissionsService } from "./permissions.service.js";
import {
  PERMISSIONS_CONTROLLER_TOKEN,
  PERMISSIONS_ENTITY_REGISTRATION_TOKEN,
  PERMISSIONS_REPOSITORY_TOKEN,
  PERMISSIONS_SERVICE_TOKEN
} from "./permissions.tokens.js";

/**
 * Permissions domain module wiring.
 */
export const CorePackPermissionsModule = defineModule({
  name: "CorePackPermissionsModule",
  imports: [CorePackAuthModule],
  providers: [
    factoryProvider(
      PERMISSIONS_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(PERMISSIONS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(PERMISSIONS_REPOSITORY_TOKEN, PermissionsRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(PERMISSIONS_SERVICE_TOKEN, PermissionsService, [PERMISSIONS_REPOSITORY_TOKEN]),
    httpProvider(PERMISSIONS_CONTROLLER_TOKEN, PermissionsController, [
      PERMISSIONS_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN
    ])
  ],
  exports: [
    PERMISSIONS_CONTROLLER_TOKEN,
    PERMISSIONS_ENTITY_REGISTRATION_TOKEN,
    PERMISSIONS_REPOSITORY_TOKEN,
    PERMISSIONS_SERVICE_TOKEN
  ]
});
