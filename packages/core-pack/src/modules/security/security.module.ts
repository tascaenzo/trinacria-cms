import {
  CORE_TOKENS,
  classProvider,
  defineModule,
  factoryProvider,
  httpProvider
} from "@trinacria-cms/kernel";
import { CorePackAuthModule } from "../auth/auth.module.js";
import { CORE_PACK_JWT_AUTH_SERVICE_TOKEN } from "../auth/auth.tokens.js";
import { CorePackI18nModule } from "../i18n/i18n.module.js";
import { I18N_MESSAGES_SERVICE_TOKEN } from "../i18n/i18n-messages.tokens.js";
import { CorePackPermissionsModule } from "../permissions/permissions.module.js";
import { PERMISSIONS_REPOSITORY_TOKEN } from "../permissions/permissions.tokens.js";
import { CorePackRolesModule } from "../roles/roles.module.js";
import { ROLE_GRANTS_REPOSITORY_TOKEN, ROLES_REPOSITORY_TOKEN } from "../roles/roles.tokens.js";
import { CorePackSettingsModule } from "../settings/settings.module.js";
import { SETTINGS_SERVICE_TOKEN } from "../settings/settings.tokens.js";
import { CorePackUsersModule } from "../users/users.module.js";
import { USERS_REPOSITORY_TOKEN } from "../users/users.tokens.js";
import { RolePolicyRulesController } from "./role-policy-rules/role-policy-rules.controller.js";
import { RolePolicyRulesRepository } from "./role-policy-rules/role-policy-rules.repository.js";
import { RolePolicyRulesService } from "./role-policy-rules/role-policy-rules.service.js";
import {
  CORE_PACK_AUTHZ_SERVICE_TOKEN,
  CORE_PACK_MANIFEST_PROVISIONING_SERVICE_TOKEN,
  CORE_PACK_ROLE_POLICY_RULES_CONTROLLER_TOKEN,
  CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN,
  CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN,
  CORE_PACK_USER_ACCESS_CONTROLLER_TOKEN,
  CORE_PACK_USER_ACCESS_SERVICE_TOKEN,
  CORE_PACK_USER_ROLES_REPOSITORY_TOKEN
} from "./security.tokens.js";
import { CorePackAuthzService } from "./services/core-pack-authz.service.js";
import { CorePackManifestProvisioningService } from "./services/security-provisioning.service.js";
import { UserAccessController } from "./user-access/user-access.controller.js";
import { UserAccessService } from "./user-access/user-access.service.js";
import { UserRolesRepository } from "./user-access/user-roles.repository.js";

/**
 * Exposes security capabilities:
 * - manifest-driven provisioning
 * - user-role assignment APIs
 * - runtime AuthzService implementation
 *
 * Policy rules are stored as an embedded array inside the role document
 * (no separate role_policy_rules collection).
 */
export const CorePackSecurityModule = defineModule({
  name: "CorePackSecurityModule",
  imports: [
    CorePackAuthModule,
    CorePackUsersModule,
    CorePackRolesModule,
    CorePackPermissionsModule,
    CorePackSettingsModule,
    CorePackI18nModule
  ],
  providers: [
    classProvider(CORE_PACK_USER_ROLES_REPOSITORY_TOKEN, UserRolesRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN, RolePolicyRulesRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN, RolePolicyRulesService, [
      ROLES_REPOSITORY_TOKEN,
      CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN
    ]),
    classProvider(
      CORE_PACK_MANIFEST_PROVISIONING_SERVICE_TOKEN,
      CorePackManifestProvisioningService,
      [
        ROLES_REPOSITORY_TOKEN,
        ROLE_GRANTS_REPOSITORY_TOKEN,
        PERMISSIONS_REPOSITORY_TOKEN,
        CORE_PACK_USER_ROLES_REPOSITORY_TOKEN,
        SETTINGS_SERVICE_TOKEN,
        I18N_MESSAGES_SERVICE_TOKEN
      ]
    ),
    classProvider(CORE_PACK_USER_ACCESS_SERVICE_TOKEN, UserAccessService, [
      USERS_REPOSITORY_TOKEN,
      ROLES_REPOSITORY_TOKEN,
      ROLE_GRANTS_REPOSITORY_TOKEN,
      CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN,
      PERMISSIONS_REPOSITORY_TOKEN,
      CORE_PACK_USER_ROLES_REPOSITORY_TOKEN
    ]),
    classProvider(CORE_PACK_AUTHZ_SERVICE_TOKEN, CorePackAuthzService, [
      CORE_PACK_USER_ACCESS_SERVICE_TOKEN
    ]),
    httpProvider(CORE_PACK_USER_ACCESS_CONTROLLER_TOKEN, UserAccessController, [
      CORE_PACK_USER_ACCESS_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN
    ]),
    httpProvider(CORE_PACK_ROLE_POLICY_RULES_CONTROLLER_TOKEN, RolePolicyRulesController, [
      CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN
    ]),
    factoryProvider(CORE_TOKENS.PLUGIN_MANIFEST_PROVISIONER, (service) => service, [
      CORE_PACK_MANIFEST_PROVISIONING_SERVICE_TOKEN
    ]),
    factoryProvider(CORE_TOKENS.AUTHZ_SERVICE, (service) => service, [
      CORE_PACK_AUTHZ_SERVICE_TOKEN
    ])
  ],
  exports: [
    CORE_PACK_USER_ROLES_REPOSITORY_TOKEN,
    CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN,
    CORE_PACK_ROLE_POLICY_RULES_CONTROLLER_TOKEN,
    CORE_PACK_USER_ACCESS_SERVICE_TOKEN,
    CORE_PACK_USER_ACCESS_CONTROLLER_TOKEN,
    CORE_PACK_AUTHZ_SERVICE_TOKEN,
    CORE_PACK_MANIFEST_PROVISIONING_SERVICE_TOKEN,
    CORE_TOKENS.PLUGIN_MANIFEST_PROVISIONER,
    CORE_TOKENS.AUTHZ_SERVICE
  ]
});
