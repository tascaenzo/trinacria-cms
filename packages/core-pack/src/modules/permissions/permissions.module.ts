import {
  CORE_TOKENS,
  classProvider,
  defineModule,
  type EntityRegistry,
  factoryProvider,
  httpProvider
} from "@trinacria-cms/kernel";
import { CorePackAuthModule } from "../auth/auth.module.js";
import { CORE_PACK_JWT_AUTH_SERVICE_TOKEN } from "../auth/auth.tokens.js";
import { CorePackCacheModule } from "../cache/cache.module.js";
import { CORE_PACK_CACHE_SERVICE_TOKEN } from "../cache/cache.tokens.js";
import { PermissionsController } from "./permissions.controller.js";
import { PERMISSIONS_ENTITY } from "./permissions.schemas.js";
import {
  PERMISSIONS_CONTROLLER_TOKEN,
  PERMISSIONS_ENTITY_REGISTRATION_TOKEN,
  PERMISSIONS_REPOSITORY_TOKEN,
  PERMISSIONS_SERVICE_TOKEN
} from "./permissions.tokens.js";
import { PermissionsRepository } from "./repositories/permissions.repository.js";
import { PermissionsService } from "./services/permissions.service.js";

/**
 * Permissions domain module wiring.
 */
export const CorePackPermissionsModule = defineModule({
  name: "CorePackPermissionsModule",
  imports: [CorePackAuthModule, CorePackCacheModule],
  providers: [
    factoryProvider(
      PERMISSIONS_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(PERMISSIONS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(PERMISSIONS_REPOSITORY_TOKEN, PermissionsRepository, [
      CORE_TOKENS.DB_ADAPTER,
      CORE_PACK_CACHE_SERVICE_TOKEN
    ]),
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
