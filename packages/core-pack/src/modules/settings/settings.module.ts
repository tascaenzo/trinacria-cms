import {
  CORE_TOKENS,
  classProvider,
  createToken,
  defineModule,
  factoryProvider,
  httpProvider
} from "@trinacria-cms/kernel";
import { createPluginOperationContext, type EntityRegistry } from "@trinacria-cms/kernel/runtime";
import {
  createPluginGrantOperations,
  PLUGIN_GRANT_OPERATIONS
} from "../../operations/plugin-grant-operations.js";
import {
  createSettingsOperations,
  SETTINGS_OPERATIONS,
  type SettingsOperations
} from "../../operations/settings-operations.js";
import { createJwtAuthMiddleware } from "../auth/auth.middleware.js";
import { CorePackAuthModule } from "../auth/auth.module.js";
import { CORE_PACK_JWT_AUTH_SERVICE_TOKEN } from "../auth/auth.tokens.js";
import type { JwtAuthService } from "../auth/services/auth.service.js";
import { SecurityAuditController } from "../security/audit/audit.controller.js";
import { SECURITY_AUDIT_ENTITY, SecurityAuditStore } from "../security/audit/security-audit.js";
import { SettingsPluginAuthService } from "./auth/plugin-auth.service.js";
import { EnvPluginAuthKeyProvider } from "./auth/plugin-auth-key-provider.js";
import { CorePackRuntimeConfigModule } from "./config/runtime-config.module.js";
import { SettingsDefinitionsRepository } from "./definitions/settings-definitions.repository.js";
import { ExternalPluginHttpAccessPolicyService } from "./plugin-access/external-plugin-http-access-policy.service.js";
import { PluginGrantsController } from "./plugin-access/plugin-grants.controller.js";
import {
  PLUGIN_GRANTS_ENTITY,
  PluginGrantsRepository
} from "./plugin-access/plugin-grants.repository.js";
import { TrustedPluginAccessPolicyService } from "./plugin-access/trusted-plugin-access-policy.service.js";
import { SETTINGS_ENTITY } from "./schemas/settings.schemas.js";
import { SettingsSecretsRepository } from "./secrets/settings-secrets.repository.js";
import { SettingsSecretsCryptoService } from "./secrets/settings-secrets-crypto.service.js";
import { createOwnedSettingsHost } from "./services/owned-settings-host.js";
import { SettingsService } from "./services/settings.service.js";
import { SettingsController } from "./settings.controller.js";
import {
  PLUGIN_GRANTS_CONTROLLER,
  PLUGIN_GRANTS_REPOSITORY,
  RUNTIME_CONFIG_SERVICE_TOKEN,
  SECURITY_AUDIT_STORE,
  SETTINGS_CONTROLLER_TOKEN,
  SETTINGS_DEFINITIONS_REPOSITORY_TOKEN,
  SETTINGS_ENTITY_REGISTRATION_TOKEN,
  SETTINGS_PLUGIN_ACCESS_POLICY_SERVICE_TOKEN,
  SETTINGS_PLUGIN_AUTH_KEY_PROVIDER_TOKEN,
  SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN,
  SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN,
  SETTINGS_SECRETS_REPOSITORY_TOKEN,
  SETTINGS_SERVICE_TOKEN,
  SETTINGS_VALUES_REPOSITORY_TOKEN
} from "./settings.tokens.js";
import { SettingsValuesRepository } from "./values/settings-values.repository.js";

/**
 * Settings module wiring over a single unified settings collection.
 */
const SECURITY_AUDIT_CONTROLLER = createToken<SecurityAuditController>("SECURITY_AUDIT_CONTROLLER");
export const CorePackSettingsModule = defineModule({
  name: "CorePackSettingsModule",
  imports: [CorePackAuthModule, CorePackRuntimeConfigModule],
  providers: [
    factoryProvider(CORE_TOKENS.AUDIT_SINK, (store) => store, [SECURITY_AUDIT_STORE]),
    httpProvider(SECURITY_AUDIT_CONTROLLER, SecurityAuditController, [
      SECURITY_AUDIT_STORE,
      CORE_TOKENS.OPERATION_AUTHORIZER,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN
    ]),
    factoryProvider(
      SECURITY_AUDIT_STORE,
      (db, registry) => {
        registry.register(SECURITY_AUDIT_ENTITY);
        return new SecurityAuditStore(db, 90, true);
      },
      [CORE_TOKENS.DB_ADAPTER, CORE_TOKENS.ENTITY_REGISTRY]
    ),
    factoryProvider(
      PLUGIN_GRANTS_REPOSITORY,
      (db, registry, audit) => {
        registry.register(PLUGIN_GRANTS_ENTITY);
        return new PluginGrantsRepository(db, audit);
      },
      [CORE_TOKENS.DB_ADAPTER, CORE_TOKENS.ENTITY_REGISTRY, SECURITY_AUDIT_STORE]
    ),
    factoryProvider(PLUGIN_GRANT_OPERATIONS, createPluginGrantOperations, [
      PLUGIN_GRANTS_REPOSITORY,
      CORE_TOKENS.OPERATION_AUTHORIZER
    ]),
    httpProvider(PLUGIN_GRANTS_CONTROLLER, PluginGrantsController, [
      PLUGIN_GRANT_OPERATIONS,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN
    ]),
    factoryProvider(CORE_TOKENS.PLUGIN_OPERATION_AUTHORIZER, (policy) => policy, [
      SETTINGS_PLUGIN_ACCESS_POLICY_SERVICE_TOKEN
    ]),
    factoryProvider(CORE_TOKENS.PLUGIN_SETTINGS_HOST, createOwnedSettingsHost, [
      SETTINGS_SERVICE_TOKEN,
      CORE_TOKENS.DB_ADAPTER,
      CORE_TOKENS.PLUGIN_RUNTIME_VIEW
    ]),
    factoryProvider(
      SETTINGS_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(SETTINGS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(SETTINGS_DEFINITIONS_REPOSITORY_TOKEN, SettingsDefinitionsRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(SETTINGS_VALUES_REPOSITORY_TOKEN, SettingsValuesRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(SETTINGS_SECRETS_REPOSITORY_TOKEN, SettingsSecretsRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    factoryProvider(
      SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN,
      async (config) =>
        SettingsSecretsCryptoService.createFromConfig(config, process.env.CMS_SETTINGS_MASTER_KEY),
      [RUNTIME_CONFIG_SERVICE_TOKEN]
    ),
    factoryProvider(
      SETTINGS_PLUGIN_AUTH_KEY_PROVIDER_TOKEN,
      () => new EnvPluginAuthKeyProvider(),
      []
    ),
    factoryProvider(
      SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN,
      (keyProvider, config, nonceStore) =>
        new SettingsPluginAuthService(keyProvider, config, nonceStore),
      [
        SETTINGS_PLUGIN_AUTH_KEY_PROVIDER_TOKEN,
        RUNTIME_CONFIG_SERVICE_TOKEN,
        CORE_TOKENS.PLUGIN_NONCE_STORE
      ]
    ),
    classProvider(SETTINGS_SERVICE_TOKEN, SettingsService, [
      SETTINGS_DEFINITIONS_REPOSITORY_TOKEN,
      SETTINGS_VALUES_REPOSITORY_TOKEN,
      SETTINGS_SECRETS_REPOSITORY_TOKEN,
      SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN
    ]),
    factoryProvider(
      SETTINGS_PLUGIN_ACCESS_POLICY_SERVICE_TOKEN,
      (runtime, grants) =>
        new TrustedPluginAccessPolicyService(
          runtime,
          new ExternalPluginHttpAccessPolicyService(grants)
        ),
      [CORE_TOKENS.PLUGIN_RUNTIME_VIEW, PLUGIN_GRANTS_REPOSITORY]
    ),
    factoryProvider(CORE_TOKENS.PLUGIN_EVENT_SUBSCRIPTION_AUTHORIZER, (policy) => policy, [
      SETTINGS_PLUGIN_ACCESS_POLICY_SERVICE_TOKEN
    ]),
    factoryProvider(CORE_TOKENS.SECURE_EVENT_PAYLOAD_AUTHORIZER, (policy) => policy, [
      SETTINGS_PLUGIN_ACCESS_POLICY_SERVICE_TOKEN
    ]),
    factoryProvider(
      CORE_TOKENS.KERNEL_ADMIN_ROUTE_GUARD,
      (auth) => ({
        middleware: createJwtAuthMiddleware(auth as JwtAuthService, {
          requireAdmin: true
        }),
        security: [{ bearerAuth: [] }]
      }),
      [CORE_PACK_JWT_AUTH_SERVICE_TOKEN]
    ),
    factoryProvider(SETTINGS_OPERATIONS, createSettingsOperations, [
      SETTINGS_SERVICE_TOKEN,
      CORE_TOKENS.OPERATION_AUTHORIZER
    ]),
    httpProvider(SETTINGS_CONTROLLER_TOKEN, SettingsController, [
      SETTINGS_OPERATIONS,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
      SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN
    ])
  ],
  exports: [
    CORE_TOKENS.AUDIT_SINK,
    SECURITY_AUDIT_CONTROLLER,
    PLUGIN_GRANTS_REPOSITORY,
    SECURITY_AUDIT_STORE,
    PLUGIN_GRANT_OPERATIONS,
    PLUGIN_GRANTS_CONTROLLER,
    SETTINGS_OPERATIONS,
    CORE_TOKENS.PLUGIN_OPERATION_AUTHORIZER,
    CORE_TOKENS.PLUGIN_SETTINGS_HOST,
    SETTINGS_CONTROLLER_TOKEN,
    SETTINGS_ENTITY_REGISTRATION_TOKEN,
    SETTINGS_DEFINITIONS_REPOSITORY_TOKEN,
    SETTINGS_VALUES_REPOSITORY_TOKEN,
    SETTINGS_SECRETS_REPOSITORY_TOKEN,
    SETTINGS_SECRETS_CRYPTO_SERVICE_TOKEN,
    SETTINGS_PLUGIN_AUTH_KEY_PROVIDER_TOKEN,
    SETTINGS_PLUGIN_AUTH_SERVICE_TOKEN,
    SETTINGS_PLUGIN_ACCESS_POLICY_SERVICE_TOKEN,
    CORE_TOKENS.PLUGIN_EVENT_SUBSCRIPTION_AUTHORIZER,
    CORE_TOKENS.SECURE_EVENT_PAYLOAD_AUTHORIZER,
    CORE_TOKENS.KERNEL_ADMIN_ROUTE_GUARD,
    SETTINGS_SERVICE_TOKEN
  ]
});
