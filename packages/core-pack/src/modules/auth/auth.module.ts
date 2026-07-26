import { EVENT_BUS_TOKEN } from "@trinacria/events";
import {
  CORE_TOKENS,
  classProvider,
  createToken,
  defineModule,
  type EntityRegistry,
  factoryProvider,
  httpProvider
} from "@trinacria-cms/kernel";
import { CorePackCacheModule } from "../cache/cache.module.js";
import { CORE_PACK_CACHE_SERVICE_TOKEN } from "../cache/cache.tokens.js";
import { LOCAL_CREDENTIALS_ENTITY } from "../installation/installation.schemas.js";
import { InstallationStateRepository } from "../installation/repositories/installation-state.repository.js";
import { LocalCredentialsRepository } from "../installation/repositories/local-credentials.repository.js";
import { PasswordHashingService } from "../installation/services/password-hashing.service.js";
import { CorePackRuntimeConfigModule } from "../settings/config/runtime-config.module.js";
import { RUNTIME_CONFIG_SERVICE_TOKEN } from "../settings/settings.tokens.js";
import { AuthController } from "./auth.controller.js";
import {
  CORE_PACK_AUTH_BLACKLIST_REPOSITORY_TOKEN,
  CORE_PACK_AUTH_CONTROLLER_TOKEN,
  CORE_PACK_AUTH_ENTITY_REGISTRATION_TOKEN,
  CORE_PACK_AUTH_FLOW_TOKENS_REPOSITORY_TOKEN,
  CORE_PACK_AUTH_LOGIN_ATTEMPT_REPOSITORY_TOKEN,
  CORE_PACK_AUTH_MFA_REPOSITORY_TOKEN,
  CORE_PACK_AUTH_MFA_SERVICE_TOKEN,
  CORE_PACK_AUTH_USER_FLOWS_SERVICE_TOKEN,
  CORE_PACK_AUTH_USERS_REPOSITORY_TOKEN,
  CORE_PACK_JWT_AUTH_SERVICE_TOKEN
} from "./auth.tokens.js";
import { AUTH_FLOW_TOKENS_ENTITY } from "./auth-flow-tokens.schemas.js";
import { AUTH_MFA_CHALLENGES_ENTITY, AUTH_MFA_CREDENTIALS_ENTITY } from "./auth-mfa.schemas.js";
import { AuthBlacklistRepository } from "./repositories/auth-blacklist.repository.js";
import { AuthFlowTokensRepository } from "./repositories/auth-flow-tokens.repository.js";
import { AuthLoginAttemptRepository } from "./repositories/auth-login-attempt.repository.js";
import { AuthMfaRepository } from "./repositories/auth-mfa.repository.js";
import { AuthUsersRepository } from "./repositories/auth-users.repository.js";
import { JwtAuthService } from "./services/auth.service.js";
import { AuthMfaService } from "./services/auth-mfa.service.js";
import { AuthUserFlowsService } from "./services/auth-user-flows.service.js";

const CORE_PACK_AUTH_INSTALLATION_STATE_REPOSITORY_TOKEN = createToken<InstallationStateRepository>(
  "CORE_PACK_AUTH_INSTALLATION_STATE_REPOSITORY"
);
const CORE_PACK_AUTH_LOCAL_CREDENTIALS_REPOSITORY_TOKEN = createToken<LocalCredentialsRepository>(
  "CORE_PACK_AUTH_LOCAL_CREDENTIALS_REPOSITORY"
);
const CORE_PACK_AUTH_PASSWORD_HASHING_SERVICE_TOKEN = createToken<PasswordHashingService>(
  "CORE_PACK_AUTH_PASSWORD_HASHING_SERVICE"
);

/**
 * JWT authentication module:
 * - wires password-based login against local credentials
 * - exposes JWT auth service and HTTP API
 */
export const CorePackAuthModule = defineModule({
  name: "CorePackAuthModule",
  imports: [CorePackRuntimeConfigModule, CorePackCacheModule],
  providers: [
    factoryProvider(
      CORE_PACK_AUTH_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(LOCAL_CREDENTIALS_ENTITY);
        (registry as EntityRegistry).register(AUTH_FLOW_TOKENS_ENTITY);
        (registry as EntityRegistry).register(AUTH_MFA_CREDENTIALS_ENTITY);
        (registry as EntityRegistry).register(AUTH_MFA_CHALLENGES_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(CORE_PACK_AUTH_USERS_REPOSITORY_TOKEN, AuthUsersRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(CORE_PACK_AUTH_LOCAL_CREDENTIALS_REPOSITORY_TOKEN, LocalCredentialsRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(CORE_PACK_AUTH_INSTALLATION_STATE_REPOSITORY_TOKEN, InstallationStateRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(CORE_PACK_AUTH_PASSWORD_HASHING_SERVICE_TOKEN, PasswordHashingService, []),
    classProvider(CORE_PACK_AUTH_BLACKLIST_REPOSITORY_TOKEN, AuthBlacklistRepository, [
      CORE_TOKENS.DB_ADAPTER,
      CORE_PACK_CACHE_SERVICE_TOKEN
    ]),
    classProvider(CORE_PACK_AUTH_LOGIN_ATTEMPT_REPOSITORY_TOKEN, AuthLoginAttemptRepository, [
      CORE_TOKENS.DB_ADAPTER,
      CORE_PACK_CACHE_SERVICE_TOKEN
    ]),
    classProvider(CORE_PACK_AUTH_MFA_REPOSITORY_TOKEN, AuthMfaRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(CORE_PACK_AUTH_MFA_SERVICE_TOKEN, AuthMfaService, [
      CORE_PACK_AUTH_MFA_REPOSITORY_TOKEN
    ]),
    classProvider(CORE_PACK_AUTH_FLOW_TOKENS_REPOSITORY_TOKEN, AuthFlowTokensRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(CORE_PACK_JWT_AUTH_SERVICE_TOKEN, JwtAuthService, [
      CORE_PACK_AUTH_USERS_REPOSITORY_TOKEN,
      CORE_PACK_AUTH_LOCAL_CREDENTIALS_REPOSITORY_TOKEN,
      CORE_PACK_AUTH_INSTALLATION_STATE_REPOSITORY_TOKEN,
      CORE_PACK_AUTH_PASSWORD_HASHING_SERVICE_TOKEN,
      CORE_PACK_AUTH_BLACKLIST_REPOSITORY_TOKEN,
      CORE_PACK_AUTH_LOGIN_ATTEMPT_REPOSITORY_TOKEN,
      RUNTIME_CONFIG_SERVICE_TOKEN,
      CORE_TOKENS.DB_ADAPTER,
      CORE_PACK_AUTH_MFA_SERVICE_TOKEN
    ]),
    classProvider(CORE_PACK_AUTH_USER_FLOWS_SERVICE_TOKEN, AuthUserFlowsService, [
      CORE_PACK_AUTH_USERS_REPOSITORY_TOKEN,
      CORE_PACK_AUTH_LOCAL_CREDENTIALS_REPOSITORY_TOKEN,
      CORE_PACK_AUTH_PASSWORD_HASHING_SERVICE_TOKEN,
      CORE_PACK_AUTH_FLOW_TOKENS_REPOSITORY_TOKEN,
      RUNTIME_CONFIG_SERVICE_TOKEN,
      CORE_TOKENS.SECURE_EVENT_PAYLOAD_STORE,
      EVENT_BUS_TOKEN
    ]),
    httpProvider(CORE_PACK_AUTH_CONTROLLER_TOKEN, AuthController, [
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
      CORE_PACK_AUTH_USER_FLOWS_SERVICE_TOKEN
    ])
  ],
  exports: [
    CORE_PACK_AUTH_ENTITY_REGISTRATION_TOKEN,
    CORE_PACK_AUTH_USERS_REPOSITORY_TOKEN,
    CORE_PACK_AUTH_FLOW_TOKENS_REPOSITORY_TOKEN,
    CORE_PACK_AUTH_MFA_SERVICE_TOKEN,
    CORE_PACK_AUTH_USER_FLOWS_SERVICE_TOKEN,
    CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
    CORE_PACK_AUTH_CONTROLLER_TOKEN
  ]
});
