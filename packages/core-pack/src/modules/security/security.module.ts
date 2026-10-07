import {
  CORE_TOKENS,
  classProvider,
  defineModule,
  factoryProvider,
  httpProvider
} from "@trinacria-cms/kernel";
import {
  createRoleRulesOperations,
  createUserAccessOperations,
  ROLE_RULES_OPERATIONS,
  USER_ACCESS_OPERATIONS
} from "../../operations/access-operations.js";
import { CoreOperationAuthorizer } from "../../operations/core-operation-authorizer.js";
import { CorePackAuthModule } from "../auth/auth.module.js";
import { CORE_PACK_JWT_AUTH_SERVICE_TOKEN } from "../auth/auth.tokens.js";
import { CorePackI18nModule } from "../i18n/i18n.module.js";
import { I18N_MESSAGES_SERVICE_TOKEN } from "../i18n/i18n-messages.tokens.js";
import { CorePackPermissionsModule } from "../permissions/permissions.module.js";
import { PERMISSIONS_REPOSITORY_TOKEN } from "../permissions/permissions.tokens.js";
import { RolesRepository } from "../roles/repositories/roles.repository.js";
import { CorePackRolesModule } from "../roles/roles.module.js";
import { ROLE_GRANTS_REPOSITORY_TOKEN, ROLES_REPOSITORY_TOKEN } from "../roles/roles.tokens.js";
import { CorePackSettingsModule } from "../settings/settings.module.js";
import {
  SETTINGS_PLUGIN_ACCESS_POLICY_SERVICE_TOKEN,
  SETTINGS_SERVICE_TOKEN
} from "../settings/settings.tokens.js";
import { CorePackUsersModule } from "../users/users.module.js";
import { USERS_REPOSITORY_TOKEN } from "../users/users.tokens.js";
import { CorePackIamSafetyModule, IAM_SAFETY } from "./iam-safety.module.js";
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
    CorePackIamSafetyModule,
    CorePackUsersModule,
    CorePackRolesModule,
    CorePackPermissionsModule,
    CorePackSettingsModule,
    CorePackI18nModule
  ],
  providers: [
    factoryProvider(
      CORE_TOKENS.OPERATION_POLICY,
      (authz, policy, audit) => new CoreOperationAuthorizer(authz, policy, audit),
      [
        CORE_PACK_AUTHZ_SERVICE_TOKEN,
        SETTINGS_PLUGIN_ACCESS_POLICY_SERVICE_TOKEN,
        CORE_TOKENS.AUDIT_SINK
      ]
    ),
    classProvider(CORE_PACK_USER_ROLES_REPOSITORY_TOKEN, UserRolesRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN, RolePolicyRulesRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    factoryProvider(
      CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN,
      (roles, rules, safety) =>
        new RolePolicyRulesService(roles, rules, (work) =>
          safety.mutate((db: import("@trinacria-cms/kernel").DbAdapter) =>
            work(
              new RolePolicyRulesService(new RolesRepository(db), new RolePolicyRulesRepository(db))
            )
          )
        ),
      [ROLES_REPOSITORY_TOKEN, CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN, IAM_SAFETY]
    ),
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
    factoryProvider(
      CORE_PACK_USER_ACCESS_SERVICE_TOKEN,
      (users, roles, grants, rules, permissions, assignments, safety) => {
        const service = new UserAccessService(
          users,
          roles,
          grants,
          rules,
          permissions,
          assignments,
          (work) =>
            safety.mutate((db: import("@trinacria-cms/kernel").DbAdapter) =>
              work(service.forDb(db))
            )
        );
        return service;
      },
      [
        USERS_REPOSITORY_TOKEN,
        ROLES_REPOSITORY_TOKEN,
        ROLE_GRANTS_REPOSITORY_TOKEN,
        CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN,
        PERMISSIONS_REPOSITORY_TOKEN,
        CORE_PACK_USER_ROLES_REPOSITORY_TOKEN,
        IAM_SAFETY
      ]
    ),
    classProvider(CORE_PACK_AUTHZ_SERVICE_TOKEN, CorePackAuthzService, [
      CORE_PACK_USER_ACCESS_SERVICE_TOKEN
    ]),
    factoryProvider(USER_ACCESS_OPERATIONS, createUserAccessOperations, [
      CORE_PACK_USER_ACCESS_SERVICE_TOKEN,
      CORE_TOKENS.OPERATION_AUTHORIZER
    ]),
    httpProvider(CORE_PACK_USER_ACCESS_CONTROLLER_TOKEN, UserAccessController, [
      USER_ACCESS_OPERATIONS,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN
    ]),
    factoryProvider(ROLE_RULES_OPERATIONS, createRoleRulesOperations, [
      CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN,
      CORE_TOKENS.OPERATION_AUTHORIZER
    ]),
    httpProvider(CORE_PACK_ROLE_POLICY_RULES_CONTROLLER_TOKEN, RolePolicyRulesController, [
      ROLE_RULES_OPERATIONS,
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
    ROLE_RULES_OPERATIONS,
    USER_ACCESS_OPERATIONS,
    CORE_TOKENS.OPERATION_POLICY,
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
