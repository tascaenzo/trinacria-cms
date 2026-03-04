import {
  classProvider,
  CORE_TOKENS,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry,
} from "@trinacria-cms/kernel";
import { RolesController } from "./roles.controller.js";
import { RoleGrantsRepository } from "./role-grants.repository.js";
import { ROLES_ENTITY } from "./roles.schemas.js";
import { RolesRepository } from "./roles.repository.js";
import { RolesService } from "./roles.service.js";
import {
  ROLE_GRANTS_REPOSITORY_TOKEN,
  ROLES_CONTROLLER_TOKEN,
  ROLES_ENTITY_REGISTRATION_TOKEN,
  ROLES_REPOSITORY_TOKEN,
  ROLES_SERVICE_TOKEN,
} from "./roles.tokens.js";

/**
 * Roles domain module wiring.
 */
export const CorePackRolesModule = defineModule({
  name: "CorePackRolesModule",
  providers: [
    factoryProvider(
      ROLES_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(ROLES_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY],
    ),
    classProvider(ROLES_REPOSITORY_TOKEN, RolesRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(ROLE_GRANTS_REPOSITORY_TOKEN, RoleGrantsRepository, [
      CORE_TOKENS.DB_ADAPTER,
    ]),
    classProvider(ROLES_SERVICE_TOKEN, RolesService, [
      ROLES_REPOSITORY_TOKEN,
      ROLE_GRANTS_REPOSITORY_TOKEN,
    ]),
    httpProvider(ROLES_CONTROLLER_TOKEN, RolesController, [ROLES_SERVICE_TOKEN]),
  ],
  exports: [
    ROLES_CONTROLLER_TOKEN,
    ROLES_ENTITY_REGISTRATION_TOKEN,
    ROLE_GRANTS_REPOSITORY_TOKEN,
    ROLES_REPOSITORY_TOKEN,
    ROLES_SERVICE_TOKEN,
  ],
});
