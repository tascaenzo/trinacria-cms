import { createToken } from "@trinacria-cms/kernel";
import type { RolePolicyRulesController } from "./role-policy-rules/role-policy-rules.controller.js";
import type { RolePolicyRulesRepository } from "./role-policy-rules/role-policy-rules.repository.js";
import type { RolePolicyRulesService } from "./role-policy-rules/role-policy-rules.service.js";
import type { CorePackAuthzService } from "./services/core-pack-authz.service.js";
import type { CorePackManifestProvisioningService } from "./services/security-provisioning.service.js";
import type { UserAccessController } from "./user-access/user-access.controller.js";
import type { UserAccessService } from "./user-access/user-access.service.js";
import type { UserRolesRepository } from "./user-access/user-roles.repository.js";

export const CORE_PACK_MANIFEST_PROVISIONING_SERVICE_TOKEN =
  createToken<CorePackManifestProvisioningService>("CORE_PACK_MANIFEST_PROVISIONING_SERVICE");
export const CORE_PACK_USER_ROLES_REPOSITORY_TOKEN = createToken<UserRolesRepository>(
  "CORE_PACK_USER_ROLES_REPOSITORY"
);
export const CORE_PACK_USER_ACCESS_SERVICE_TOKEN = createToken<UserAccessService>(
  "CORE_PACK_USER_ACCESS_SERVICE"
);
export const CORE_PACK_USER_ACCESS_CONTROLLER_TOKEN = createToken<UserAccessController>(
  "CORE_PACK_USER_ACCESS_CONTROLLER"
);
export const CORE_PACK_AUTHZ_SERVICE_TOKEN =
  createToken<CorePackAuthzService>("CORE_PACK_AUTHZ_SERVICE");
export const CORE_PACK_ROLE_POLICY_RULES_REPOSITORY_TOKEN = createToken<RolePolicyRulesRepository>(
  "CORE_PACK_ROLE_POLICY_RULES_REPOSITORY"
);
export const CORE_PACK_ROLE_POLICY_RULES_SERVICE_TOKEN = createToken<RolePolicyRulesService>(
  "CORE_PACK_ROLE_POLICY_RULES_SERVICE"
);
export const CORE_PACK_ROLE_POLICY_RULES_CONTROLLER_TOKEN = createToken<RolePolicyRulesController>(
  "CORE_PACK_ROLE_POLICY_RULES_CONTROLLER"
);
