import {
  classProvider,
  CORE_TOKENS,
  createToken,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry,
} from "@trinacria-cms/kernel";
import { InstallationStateRepository } from "../installation/installation-state.repository.js";
import {
  INSTALLATION_STATE_ENTITY,
  LOCAL_CREDENTIALS_ENTITY,
} from "../installation/installation.schemas.js";
import { LocalCredentialsRepository } from "../installation/local-credentials.repository.js";
import { PasswordHashingService } from "../installation/password-hashing.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthUsersRepository } from "./auth-users.repository.js";
import { JwtAuthService } from "./auth.service.js";
import {
  CORE_PACK_AUTH_CONTROLLER_TOKEN,
  CORE_PACK_AUTH_ENTITY_REGISTRATION_TOKEN,
  CORE_PACK_AUTH_USERS_REPOSITORY_TOKEN,
  CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
} from "./auth.tokens.js";

const CORE_PACK_AUTH_INSTALLATION_STATE_REPOSITORY_TOKEN =
  createToken<InstallationStateRepository>(
    "CORE_PACK_AUTH_INSTALLATION_STATE_REPOSITORY",
  );
const CORE_PACK_AUTH_LOCAL_CREDENTIALS_REPOSITORY_TOKEN =
  createToken<LocalCredentialsRepository>(
    "CORE_PACK_AUTH_LOCAL_CREDENTIALS_REPOSITORY",
  );
const CORE_PACK_AUTH_PASSWORD_HASHING_SERVICE_TOKEN =
  createToken<PasswordHashingService>("CORE_PACK_AUTH_PASSWORD_HASHING_SERVICE");

/**
 * JWT authentication module:
 * - wires password-based login against local credentials
 * - exposes JWT auth service and HTTP API
 */
export const CorePackAuthModule = defineModule({
  name: "CorePackAuthModule",
  providers: [
    factoryProvider(
      CORE_PACK_AUTH_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        // Registered here as shared prerequisites for auth flows.
        (registry as EntityRegistry).register(INSTALLATION_STATE_ENTITY);
        (registry as EntityRegistry).register(LOCAL_CREDENTIALS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY],
    ),
    classProvider(CORE_PACK_AUTH_USERS_REPOSITORY_TOKEN, AuthUsersRepository, [
      CORE_TOKENS.DB_ADAPTER,
    ]),
    classProvider(
      CORE_PACK_AUTH_LOCAL_CREDENTIALS_REPOSITORY_TOKEN,
      LocalCredentialsRepository,
      [
        CORE_TOKENS.DB_ADAPTER,
      ],
    ),
    classProvider(
      CORE_PACK_AUTH_INSTALLATION_STATE_REPOSITORY_TOKEN,
      InstallationStateRepository,
      [
        CORE_TOKENS.DB_ADAPTER,
      ],
    ),
    classProvider(
      CORE_PACK_AUTH_PASSWORD_HASHING_SERVICE_TOKEN,
      PasswordHashingService,
      [],
    ),
    classProvider(CORE_PACK_JWT_AUTH_SERVICE_TOKEN, JwtAuthService, [
      CORE_PACK_AUTH_USERS_REPOSITORY_TOKEN,
      CORE_PACK_AUTH_LOCAL_CREDENTIALS_REPOSITORY_TOKEN,
      CORE_PACK_AUTH_INSTALLATION_STATE_REPOSITORY_TOKEN,
      CORE_PACK_AUTH_PASSWORD_HASHING_SERVICE_TOKEN,
    ]),
    httpProvider(CORE_PACK_AUTH_CONTROLLER_TOKEN, AuthController, [
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
    ]),
  ],
  exports: [
    CORE_PACK_AUTH_ENTITY_REGISTRATION_TOKEN,
    CORE_PACK_AUTH_USERS_REPOSITORY_TOKEN,
    CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
    CORE_PACK_AUTH_CONTROLLER_TOKEN,
  ],
});
