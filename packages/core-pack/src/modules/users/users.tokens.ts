import { createCapabilityToken, createToken } from "@trinacria-cms/kernel";
import type { UsersRepository } from "./repositories/users.repository.js";
import type { UsersService } from "./services/users.service.js";
import type { UsersController } from "./users.controller.js";

export const USERS_REPOSITORY_TOKEN = createToken<UsersRepository>("CORE_PACK_USERS_REPOSITORY");
export const USERS_SERVICE_TOKEN = createCapabilityToken<UsersService>("users.service");
export const USERS_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "CORE_PACK_USERS_ENTITY_REGISTRATION"
);
export const USERS_CONTROLLER_TOKEN = createToken<UsersController>("CORE_PACK_USERS_CONTROLLER");
