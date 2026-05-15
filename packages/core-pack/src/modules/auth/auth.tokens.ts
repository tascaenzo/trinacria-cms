import { createToken } from "@trinacria-cms/kernel";
import { AuthController } from "./auth.controller.js";
import { AuthUsersRepository } from "./auth-users.repository.js";
import { JwtAuthService } from "./auth.service.js";

export const CORE_PACK_AUTH_USERS_REPOSITORY_TOKEN = createToken<AuthUsersRepository>(
  "CORE_PACK_AUTH_USERS_REPOSITORY"
);
export const CORE_PACK_JWT_AUTH_SERVICE_TOKEN = createToken<JwtAuthService>(
  "CORE_PACK_JWT_AUTH_SERVICE"
);
export const CORE_PACK_AUTH_CONTROLLER_TOKEN = createToken<AuthController>(
  "CORE_PACK_AUTH_CONTROLLER"
);
export const CORE_PACK_AUTH_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "CORE_PACK_AUTH_ENTITY_REGISTRATION"
);
