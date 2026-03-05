import {
  classProvider,
  CORE_TOKENS,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry,
} from "@trinacria-cms/kernel";
import { CorePackAuthModule } from "../auth/auth.module.js";
import { CORE_PACK_JWT_AUTH_SERVICE_TOKEN } from "../auth/auth.tokens.js";
import { UsersController } from "./users.controller.js";
import { USERS_ENTITY } from "./users.schemas.js";
import { UsersRepository } from "./users.repository.js";
import { UsersService } from "./users.service.js";
import {
  USERS_CONTROLLER_TOKEN,
  USERS_ENTITY_REGISTRATION_TOKEN,
  USERS_REPOSITORY_TOKEN,
  USERS_SERVICE_TOKEN,
} from "./users.tokens.js";

/**
 * Users baseline module scaffold.
 */
export const CorePackUsersModule = defineModule({
  name: "CorePackUsersModule",
  imports: [CorePackAuthModule],
  providers: [
    factoryProvider(
      USERS_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(USERS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY],
    ),
    classProvider(USERS_REPOSITORY_TOKEN, UsersRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(USERS_SERVICE_TOKEN, UsersService, [USERS_REPOSITORY_TOKEN]),
    httpProvider(USERS_CONTROLLER_TOKEN, UsersController, [
      USERS_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
    ]),
  ],
  exports: [
    USERS_CONTROLLER_TOKEN,
    USERS_ENTITY_REGISTRATION_TOKEN,
    USERS_REPOSITORY_TOKEN,
    USERS_SERVICE_TOKEN,
  ],
});
