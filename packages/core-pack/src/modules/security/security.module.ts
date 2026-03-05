import {
  classProvider,
  CORE_TOKENS,
  createToken,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry,
} from "@trinacria-cms/kernel";
import { CorePackAuthModule } from "../auth/auth.module.js";
import { CORE_PACK_JWT_AUTH_SERVICE_TOKEN } from "../auth/auth.tokens.js";
import { CorePackPermissionsModule } from "../permissions/permissions.module.js";
import { PERMISSIONS_REPOSITORY_TOKEN } from "../permissions/permissions.tokens.js";
import { CorePackRolesModule } from "../roles/roles.module.js";
import {
  ROLE_GRANTS_REPOSITORY_TOKEN,
  ROLES_REPOSITORY_TOKEN,
} from "../roles/roles.tokens.js";
import { CorePackUsersModule } from "../users/users.module.js";
import { USERS_REPOSITORY_TOKEN } from "../users/users.tokens.js";
import { CorePackAuthzService } from "./core-pack-authz.service.js";
import { RolePolicyRulesController } from "./role-policy-rules/role-policy-rules.controller.js";
import { RolePolicyRulesRepository } from "./role-policy-rules/role-policy-rules.repository.js";
import { RolePolicyRulesService } from "./role-policy-rules/role-policy-rules.service.js";
import { ROLE_POLICY_RULES_ENTITY } from "./role-policy-rules/role-policy-rules.schemas.js";
import { CorePackSecurityProvisioningService } from "./security-provisioning.service.js";
import { UserAccessController } from "./user-access/user-access.controller.js";
import { UserAccessService } from "./user-access/user-access.service.js";
import { UserRolesRepository } from "./user-access/user-roles.repository.js";
import {
  CORE_PACK_AUTHZ_SERVICE_TOKEN,
  CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN,
  CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN,
  CORE_PACK_ROLE_POLICY_RULES_CONTROLLER_TOKEN,
  CORE_PACK_SECURITY_PROVISIONING_SERVICE_TOKEN,
  CORE_PACK_USER_ACCESS_CONTROLLER_TOKEN,
  CORE_PACK_USER_ACCESS_SERVICE_TOKEN,
  CORE_PACK_USER_ROLES_REPOSITORY_TOKEN,
} from "./security.tokens.js";

const CORE_PACK_SECURITY_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "CORE_PACK_SECURITY_ENTITY_REGISTRATION",
);

/**
 * Exposes security capabilities:
 * - manifest-driven provisioning
 * - user-role assignment APIs
 * - runtime AuthzService implementation
 */
export const CorePackSecurityModule = defineModule({
  name: "CorePackSecurityModule",
  imports: [
    CorePackAuthModule,
    CorePackUsersModule,
    CorePackRolesModule,
    CorePackPermissionsModule,
  ],
  providers: [
    factoryProvider(
      CORE_PACK_SECURITY_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(ROLE_POLICY_RULES_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY],
    ),
    classProvider(CORE_PACK_USER_ROLES_REPOSITORY_TOKEN, UserRolesRepository, [
      CORE_TOKENS.DB_ADAPTER,
    ]),
    classProvider(
      CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN,
      RolePolicyRulesRepository,
      [CORE_TOKENS.DB_ADAPTER],
    ),
    classProvider(CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN, RolePolicyRulesService, [
      ROLES_REPOSITORY_TOKEN,
      CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN,
    ]),
    classProvider(
      CORE_PACK_SECURITY_PROVISIONING_SERVICE_TOKEN,
      CorePackSecurityProvisioningService,
      [
        ROLES_REPOSITORY_TOKEN,
        ROLE_GRANTS_REPOSITORY_TOKEN,
        CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN,
        PERMISSIONS_REPOSITORY_TOKEN,
        CORE_PACK_USER_ROLES_REPOSITORY_TOKEN,
      ],
    ),
    classProvider(CORE_PACK_USER_ACCESS_SERVICE_TOKEN, UserAccessService, [
      USERS_REPOSITORY_TOKEN,
      ROLES_REPOSITORY_TOKEN,
      ROLE_GRANTS_REPOSITORY_TOKEN,
      CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN,
      PERMISSIONS_REPOSITORY_TOKEN,
      CORE_PACK_USER_ROLES_REPOSITORY_TOKEN,
    ]),
    classProvider(CORE_PACK_AUTHZ_SERVICE_TOKEN, CorePackAuthzService, [
      CORE_PACK_USER_ACCESS_SERVICE_TOKEN,
    ]),
    httpProvider(CORE_PACK_USER_ACCESS_CONTROLLER_TOKEN, UserAccessController, [
      CORE_PACK_USER_ACCESS_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
    ]),
    httpProvider(
      CORE_PACK_ROLE_POLICY_RULES_CONTROLLER_TOKEN,
      RolePolicyRulesController,
      [
        CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN,
        CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
      ],
    ),
    factoryProvider(
      CORE_TOKENS.PLUGIN_SECURITY_PROVISIONER,
      (service) => service,
      [CORE_PACK_SECURITY_PROVISIONING_SERVICE_TOKEN],
    ),
    factoryProvider(CORE_TOKENS.AUTHZ_SERVICE, (service) => service, [
      CORE_PACK_AUTHZ_SERVICE_TOKEN,
    ]),
  ],
  exports: [
    CORE_PACK_USER_ROLES_REPOSITORY_TOKEN,
    CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN,
    CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN,
    CORE_PACK_ROLE_POLICY_RULES_CONTROLLER_TOKEN,
    CORE_PACK_USER_ACCESS_SERVICE_TOKEN,
    CORE_PACK_USER_ACCESS_CONTROLLER_TOKEN,
    CORE_PACK_AUTHZ_SERVICE_TOKEN,
    CORE_PACK_SECURITY_PROVISIONING_SERVICE_TOKEN,
    CORE_TOKENS.PLUGIN_SECURITY_PROVISIONER,
    CORE_TOKENS.AUTHZ_SERVICE,
  ],
});
