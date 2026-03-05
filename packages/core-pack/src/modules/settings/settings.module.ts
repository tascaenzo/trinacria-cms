import {
  classProvider,
  CORE_TOKENS,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry,
} from "@trinacria-cms/kernel";
import { SettingsController } from "./settings.controller.js";
import { SettingsDefinitionsRepository } from "./definitions/settings-definitions.repository.js";
import { EnvPluginAuthKeyProvider } from "./auth/settings-plugin-auth-key-provider.js";
import { SettingsPluginAuthService } from "./auth/settings-plugin-auth.service.js";
import { SettingsSecretsCryptoService } from "./secrets/settings-secrets-crypto.service.js";
import { SettingsSecretsRepository } from "./secrets/settings-secrets.repository.js";
import {
  SETTINGS_ENTITY,
} from "./settings.schemas.js";
import { SettingsService } from "./settings.service.js";
import { SettingsValuesRepository } from "./values/settings-values.repository.js";
import {
  SETTINGS_CONTROLLER_TOKEN,
  SETTINGS_DEFINITIONS_REPOSITORY_TOKEN,
  SETTINGS_ENTITY_REGISTRATION_TOKEN,
  SETTINGS_PLUGIN_AUTH_KEY_PROVIDER_TOKEN,
  SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN,
  SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN,
  SETTINGS_SECRETS_REPOSITORY_TOKEN,
  SETTINGS_SERVICE_TOKEN,
  SETTINGS_VALUES_REPOSITORY_TOKEN,
} from "./settings.tokens.js";

/**
 * Settings module wiring over a single unified settings collection.
 */
export const CorePackSettingsModule = defineModule({
  name: "CorePackSettingsModule",
  providers: [
    factoryProvider(
      SETTINGS_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(SETTINGS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY],
    ),
    classProvider(
      SETTINGS_DEFINITIONS_REPOSITORY_TOKEN,
      SettingsDefinitionsRepository,
      [CORE_TOKENS.DB_ADAPTER],
    ),
    classProvider(SETTINGS_VALUES_REPOSITORY_TOKEN, SettingsValuesRepository, [
      CORE_TOKENS.DB_ADAPTER,
    ]),
    classProvider(SETTINGS_SECRETS_REPOSITORY_TOKEN, SettingsSecretsRepository, [
      CORE_TOKENS.DB_ADAPTER,
    ]),
    factoryProvider(
      SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN,
      () =>
        new SettingsSecretsCryptoService({
          masterKey: process.env.CMS_SETTINGS_MASTER_KEY,
          keyVersion: process.env.CMS_SETTINGS_MASTER_KEY_VERSION,
        }),
      [],
    ),
    factoryProvider(
      SETTINGS_PLUGIN_AUTH_KEY_PROVIDER_TOKEN,
      () => new EnvPluginAuthKeyProvider(),
      [],
    ),
    factoryProvider(
      SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN,
      (keyProvider) => new SettingsPluginAuthService(keyProvider),
      [SETTINGS_PLUGIN_AUTH_KEY_PROVIDER_TOKEN],
    ),
    classProvider(SETTINGS_SERVICE_TOKEN, SettingsService, [
      SETTINGS_DEFINITIONS_REPOSITORY_TOKEN,
      SETTINGS_VALUES_REPOSITORY_TOKEN,
      SETTINGS_SECRETS_REPOSITORY_TOKEN,
      SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN,
    ]),
    httpProvider(SETTINGS_CONTROLLER_TOKEN, SettingsController, [
      SETTINGS_SERVICE_TOKEN,
      SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN,
    ]),
  ],
  exports: [
    SETTINGS_CONTROLLER_TOKEN,
    SETTINGS_ENTITY_REGISTRATION_TOKEN,
    SETTINGS_DEFINITIONS_REPOSITORY_TOKEN,
    SETTINGS_VALUES_REPOSITORY_TOKEN,
    SETTINGS_SECRETS_REPOSITORY_TOKEN,
    SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN,
    SETTINGS_PLUGIN_AUTH_KEY_PROVIDER_TOKEN,
    SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN,
    SETTINGS_SERVICE_TOKEN,
  ],
});
