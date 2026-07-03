import {
  classProvider,
  CORE_TOKENS,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry
} from "@trinacria-cms/kernel";
import { EVENT_BUS_TOKEN } from "@trinacria/events";
import { CorePackCacheModule } from "../cache/cache.module.js";
import { CORE_PACK_CACHE_SERVICE_TOKEN } from "../cache/cache.tokens.js";
import { CorePackSecurityModule } from "../security/security.module.js";
import {
  CORE_PACK_SECURITY_PROVISIONING_SERVICE_TOKEN,
  CORE_PACK_USER_ACCESS_SERVICE_TOKEN
} from "../security/security.tokens.js";
import { CorePackSettingsModule } from "../settings/settings.module.js";
import { SETTINGS_SERVICE_TOKEN } from "../settings/settings.tokens.js";
import { CorePackUsersModule } from "../users/users.module.js";
import { USERS_REPOSITORY_TOKEN } from "../users/users.tokens.js";
import { InstallationController } from "./installation.controller.js";
import { InstallationStateRepository } from "./repositories/installation-state.repository.js";
import { LOCAL_CREDENTIALS_ENTITY } from "./installation.schemas.js";
import { InstallationService } from "./services/installation.service.js";
import { LocalCredentialsRepository } from "./repositories/local-credentials.repository.js";
import { PasswordHashingService } from "./services/password-hashing.service.js";
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
 * - entity registration for local credentials (installation state stored in settings collection)
 * - first-run bootstrap service
 * - HTTP endpoints under `/v1/install/*`
 */
export const CorePackInstallationModule = defineModule({
  name: "CorePackInstallationModule",
  imports: [
    CorePackUsersModule,
    CorePackSecurityModule,
    CorePackSettingsModule,
    CorePackCacheModule
  ],
  providers: [
    factoryProvider(
      CORE_PACK_INSTALLATION_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(LOCAL_CREDENTIALS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(INSTALLATION_STATE_REPOSITORY_TOKEN, InstallationStateRepository, [
      CORE_TOKENS.DB_ADAPTER,
      CORE_PACK_CACHE_SERVICE_TOKEN
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
      PASSWORD_HASHING_SERVICE_TOKEN,
      SETTINGS_SERVICE_TOKEN,
      EVENT_BUS_TOKEN
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
