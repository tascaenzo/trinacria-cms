import {
  classProvider,
  CORE_TOKENS,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry
} from "@trinacria-cms/kernel";
import { CorePackSecurityModule } from "../security/security.module.js";
import {
  CORE_PACK_SECURITY_PROVISIONING_SERVICE_TOKEN,
  CORE_PACK_USER_ACCESS_SERVICE_TOKEN
} from "../security/security.tokens.js";
import { CorePackUsersModule } from "../users/users.module.js";
import { USERS_REPOSITORY_TOKEN } from "../users/users.tokens.js";
import { InstallationController } from "./installation.controller.js";
import { InstallationStateRepository } from "./installation-state.repository.js";
import { INSTALLATION_STATE_ENTITY, LOCAL_CREDENTIALS_ENTITY } from "./installation.schemas.js";
import { InstallationService } from "./installation.service.js";
import { LocalCredentialsRepository } from "./local-credentials.repository.js";
import { PasswordHashingService } from "./password-hashing.service.js";
import {
  CORE_PACK_INSTALLATION_CONTROLLER_TOKEN,
  CORE_PACK_INSTALLATION_ENTITY_REGISTRATION_TOKEN,
  CORE_PACK_INSTALLATION_SERVICE_TOKEN,
  INSTALLATION_STATE_REPOSITORY_TOKEN,
  LOCAL_CREDENTIALS_REPOSITORY_TOKEN,
  PASSWORD_HASHING_SERVICE_TOKEN
} from "./installation.tokens.js";

/**
 * Installation module wiring:
 * - entity registration for installation state and credentials
 * - first-run bootstrap service
 * - HTTP endpoints under `/v1/install/*`
 */
export const CorePackInstallationModule = defineModule({
  name: "CorePackInstallationModule",
  imports: [CorePackUsersModule, CorePackSecurityModule],
  providers: [
    factoryProvider(
      CORE_PACK_INSTALLATION_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(INSTALLATION_STATE_ENTITY);
        (registry as EntityRegistry).register(LOCAL_CREDENTIALS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(INSTALLATION_STATE_REPOSITORY_TOKEN, InstallationStateRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(LOCAL_CREDENTIALS_REPOSITORY_TOKEN, LocalCredentialsRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(PASSWORD_HASHING_SERVICE_TOKEN, PasswordHashingService, []),
    classProvider(CORE_PACK_INSTALLATION_SERVICE_TOKEN, InstallationService, [
      INSTALLATION_STATE_REPOSITORY_TOKEN,
      LOCAL_CREDENTIALS_REPOSITORY_TOKEN,
      USERS_REPOSITORY_TOKEN,
      CORE_PACK_USER_ACCESS_SERVICE_TOKEN,
      CORE_PACK_SECURITY_PROVISIONING_SERVICE_TOKEN,
      PASSWORD_HASHING_SERVICE_TOKEN
    ]),
    httpProvider(CORE_PACK_INSTALLATION_CONTROLLER_TOKEN, InstallationController, [
      CORE_PACK_INSTALLATION_SERVICE_TOKEN
    ])
  ],
  exports: [
    CORE_PACK_INSTALLATION_ENTITY_REGISTRATION_TOKEN,
    INSTALLATION_STATE_REPOSITORY_TOKEN,
    LOCAL_CREDENTIALS_REPOSITORY_TOKEN,
    PASSWORD_HASHING_SERVICE_TOKEN,
    CORE_PACK_INSTALLATION_SERVICE_TOKEN,
    CORE_PACK_INSTALLATION_CONTROLLER_TOKEN
  ]
});
