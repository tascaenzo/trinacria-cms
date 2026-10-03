import { EVENT_BUS_TOKEN } from "@trinacria/events";
import {
  CORE_TOKENS,
  classProvider,
  defineModule,
  factoryProvider,
  httpProvider
} from "@trinacria-cms/kernel";
import type { EntityRegistry } from "@trinacria-cms/kernel/runtime";
import { createUsersOperations, USERS_OPERATIONS } from "../../operations/access-operations.js";
import { AUTH_FLOW_OPERATIONS } from "../../operations/auth-flow-operations.js";
import { CorePackAuthModule } from "../auth/auth.module.js";
import { CORE_PACK_JWT_AUTH_SERVICE_TOKEN } from "../auth/auth.tokens.js";
import { UsersRepository } from "./repositories/users.repository.js";
import { UsersService } from "./services/users.service.js";
import { UsersController } from "./users.controller.js";
import { USERS_ENTITY } from "./users.schemas.js";
import {
  USERS_CONTROLLER_TOKEN,
  USERS_ENTITY_REGISTRATION_TOKEN,
  USERS_REPOSITORY_TOKEN,
  USERS_SERVICE_TOKEN
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
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(USERS_REPOSITORY_TOKEN, UsersRepository, [CORE_TOKENS.DB_ADAPTER]),
    factoryProvider(
      USERS_SERVICE_TOKEN,
      (
        repository,
        events,
        durable: import("@trinacria-cms/kernel/runtime").MongoDurableEventStore
      ) =>
        new UsersService(repository, events, (work) =>
          durable.transaction("core-pack", (db, publisher) =>
            work(new UsersService(new UsersRepository(db), publisher))
          )
        ),
      [USERS_REPOSITORY_TOKEN, EVENT_BUS_TOKEN, CORE_TOKENS.DURABLE_EVENTS]
    ),
    factoryProvider(USERS_OPERATIONS, createUsersOperations, [
      USERS_SERVICE_TOKEN,
      CORE_TOKENS.OPERATION_AUTHORIZER
    ]),
    httpProvider(USERS_CONTROLLER_TOKEN, UsersController, [
      USERS_OPERATIONS,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
      AUTH_FLOW_OPERATIONS
    ])
  ],
  exports: [
    USERS_OPERATIONS,
    USERS_CONTROLLER_TOKEN,
    USERS_ENTITY_REGISTRATION_TOKEN,
    USERS_REPOSITORY_TOKEN,
    USERS_SERVICE_TOKEN
  ]
});
