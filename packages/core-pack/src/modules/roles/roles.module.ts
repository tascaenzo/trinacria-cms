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
import { RoleGrantsRepository } from "./grants/role-grants.repository.js";
import { RolesRepository } from "./repositories/roles.repository.js";
import { RolesController } from "./roles.controller.js";
import { ROLES_ENTITY } from "./roles.schemas.js";
import {
  ROLE_GRANTS_REPOSITORY_TOKEN,
  ROLES_CONTROLLER_TOKEN,
  ROLES_ENTITY_REGISTRATION_TOKEN,
  ROLES_REPOSITORY_TOKEN,
  ROLES_SERVICE_TOKEN
} from "./roles.tokens.js";
import { RolesService } from "./services/roles.service.js";

/**
 * Roles domain module wiring.
 */
export const CorePackRolesModule = defineModule({
  name: "CorePackRolesModule",
  imports: [CorePackAuthModule, CorePackCacheModule],
  providers: [
    factoryProvider(
      ROLES_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(ROLES_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(ROLES_REPOSITORY_TOKEN, RolesRepository, [
      CORE_TOKENS.DB_ADAPTER,
      CORE_PACK_CACHE_SERVICE_TOKEN
    ]),
    classProvider(ROLE_GRANTS_REPOSITORY_TOKEN, RoleGrantsRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(ROLES_SERVICE_TOKEN, RolesService, [
      ROLES_REPOSITORY_TOKEN,
      ROLE_GRANTS_REPOSITORY_TOKEN
    ]),
    httpProvider(ROLES_CONTROLLER_TOKEN, RolesController, [
      ROLES_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN
    ])
  ],
  exports: [
    ROLES_CONTROLLER_TOKEN,
    ROLES_ENTITY_REGISTRATION_TOKEN,
    ROLE_GRANTS_REPOSITORY_TOKEN,
    ROLES_REPOSITORY_TOKEN,
    ROLES_SERVICE_TOKEN
  ]
});
