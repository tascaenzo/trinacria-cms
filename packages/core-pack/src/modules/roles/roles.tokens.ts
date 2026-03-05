import { createCapabilityToken, createToken } from "@trinacria-cms/kernel";
import { RolesController } from "./roles.controller.js";
import { RoleGrantsRepository } from "./grants/role-grants.repository.js";
import { RolesRepository } from "./roles.repository.js";
import { RolesService } from "./roles.service.js";

export const ROLES_REPOSITORY_TOKEN =
  createToken<RolesRepository>("CORE_PACK_ROLES_REPOSITORY");
export const ROLE_GRANTS_REPOSITORY_TOKEN = createToken<RoleGrantsRepository>(
  "CORE_PACK_ROLE_GRANTS_REPOSITORY",
);
export const ROLES_SERVICE_TOKEN =
  createCapabilityToken<RolesService>("roles.service");
export const ROLES_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "CORE_PACK_ROLES_ENTITY_REGISTRATION",
);
export const ROLES_CONTROLLER_TOKEN =
  createToken<RolesController>("CORE_PACK_ROLES_CONTROLLER");
