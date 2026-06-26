import { createCapabilityToken, createToken } from "@trinacria-cms/kernel";
import type { RuntimeConfigService } from "./config/runtime-config.service.js";
import { SettingsController } from "./settings.controller.js";
import { SettingsDefinitionsRepository } from "./definitions/settings-definitions.repository.js";
import type { PluginAuthKeyProvider } from "./auth/plugin-auth-key-provider.js";
import { SettingsPluginAuthService } from "./auth/plugin-auth.service.js";
import { SettingsSecretsCryptoService } from "./secrets/settings-secrets-crypto.service.js";
import { SettingsSecretsRepository } from "./secrets/settings-secrets.repository.js";
import { SettingsService } from "./settings.service.js";
import { SettingsValuesRepository } from "./values/settings-values.repository.js";

export const SETTINGS_DEFINITIONS_REPOSITORY_TOKEN = createToken<SettingsDefinitionsRepository>(
  "CORE_PACK_SETTINGS_DEFINITIONS_REPOSITORY"
);
export const SETTINGS_VALUES_REPOSITORY_TOKEN = createToken<SettingsValuesRepository>(
  "CORE_PACK_SETTINGS_VALUES_REPOSITORY"
);
export const SETTINGS_SECRETS_REPOSITORY_TOKEN = createToken<SettingsSecretsRepository>(
  "CORE_PACK_SETTINGS_SECRETS_REPOSITORY"
);
export const SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN = createToken<SettingsSecretsCryptoService>(
  "CORE_PACK_SETTINGS_SECRETS_CRYPTO_SERVICE"
);
export const SETTINGS_PLUGIN_AUTH_KEY_PROVIDER_TOKEN = createToken<PluginAuthKeyProvider>(
  "CORE_PACK_SETTINGS_PLUGIN_AUTH_KEY_PROVIDER"
);
export const SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN = createToken<SettingsPluginAuthService>(
  "CORE_PACK_SETTINGS_PLUGIN_AUTH_SERVICE"
);
export const SETTINGS_SERVICE_TOKEN = createCapabilityToken<SettingsService>("settings.service");
export const SETTINGS_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "CORE_PACK_SETTINGS_ENTITY_REGISTRATION"
);
export const SETTINGS_CONTROLLER_TOKEN = createToken<SettingsController>(
  "CORE_PACK_SETTINGS_CONTROLLER"
);

export const RUNTIME_CONFIG_SERVICE_TOKEN = createToken<RuntimeConfigService>(
  "CORE_PACK_RUNTIME_CONFIG_SERVICE"
);
