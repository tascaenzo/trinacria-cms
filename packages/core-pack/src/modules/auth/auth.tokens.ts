import { createToken } from "@trinacria-cms/kernel";
import { AuthBlacklistRepository } from "./auth-blacklist.repository.js";
import { AuthController } from "./auth.controller.js";
import { AuthLoginAttemptRepository } from "./auth-login-attempt.repository.js";
import { AuthFlowTokensRepository } from "./auth-flow-tokens.repository.js";
import { AuthUserFlowsService } from "./auth-user-flows.service.js";
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
export const CORE_PACK_AUTH_BLACKLIST_REPOSITORY_TOKEN = createToken<AuthBlacklistRepository>(
  "CORE_PACK_AUTH_BLACKLIST_REPOSITORY"
);
export const CORE_PACK_AUTH_LOGIN_ATTEMPT_REPOSITORY_TOKEN =
  createToken<AuthLoginAttemptRepository>("CORE_PACK_AUTH_LOGIN_ATTEMPT_REPOSITORY");
export const CORE_PACK_AUTH_FLOW_TOKENS_REPOSITORY_TOKEN = createToken<AuthFlowTokensRepository>(
  "CORE_PACK_AUTH_FLOW_TOKENS_REPOSITORY"
);
export const CORE_PACK_AUTH_USER_FLOWS_SERVICE_TOKEN = createToken<AuthUserFlowsService>(
  "CORE_PACK_AUTH_USER_FLOWS_SERVICE"
);
