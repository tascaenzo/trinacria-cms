import { createToken } from "@trinacria-cms/kernel";
import type { AuthController } from "./auth.controller.js";
import type { AuthBlacklistRepository } from "./repositories/auth-blacklist.repository.js";
import type { AuthFlowTokensRepository } from "./repositories/auth-flow-tokens.repository.js";
import type { AuthLoginAttemptRepository } from "./repositories/auth-login-attempt.repository.js";
import type { AuthMfaRepository } from "./repositories/auth-mfa.repository.js";
import type { AuthUsersRepository } from "./repositories/auth-users.repository.js";
import type { JwtAuthService } from "./services/auth.service.js";
import type { AuthMfaService } from "./services/auth-mfa.service.js";
import type { AuthUserFlowsService } from "./services/auth-user-flows.service.js";

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
export const CORE_PACK_AUTH_MFA_REPOSITORY_TOKEN = createToken<AuthMfaRepository>(
  "CORE_PACK_AUTH_MFA_REPOSITORY"
);
export const CORE_PACK_AUTH_MFA_SERVICE_TOKEN = createToken<AuthMfaService>(
  "CORE_PACK_AUTH_MFA_SERVICE"
);
export const CORE_PACK_AUTH_FLOW_TOKENS_REPOSITORY_TOKEN = createToken<AuthFlowTokensRepository>(
  "CORE_PACK_AUTH_FLOW_TOKENS_REPOSITORY"
);
export const CORE_PACK_AUTH_USER_FLOWS_SERVICE_TOKEN = createToken<AuthUserFlowsService>(
  "CORE_PACK_AUTH_USER_FLOWS_SERVICE"
);
