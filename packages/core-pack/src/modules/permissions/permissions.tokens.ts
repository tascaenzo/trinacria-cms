import { createCapabilityToken, createToken } from "@trinacria-cms/kernel";
import { PermissionsController } from "./permissions.controller.js";
import { PermissionsRepository } from "./permissions.repository.js";
import { PermissionsService } from "./permissions.service.js";

export const PERMISSIONS_REPOSITORY_TOKEN = createToken<PermissionsRepository>(
  "CORE_PACK_PERMISSIONS_REPOSITORY",
);
export const PERMISSIONS_SERVICE_TOKEN =
  createCapabilityToken<PermissionsService>("permissions.service");
export const PERMISSIONS_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "CORE_PACK_PERMISSIONS_ENTITY_REGISTRATION",
);
export const PERMISSIONS_CONTROLLER_TOKEN = createToken<PermissionsController>(
  "CORE_PACK_PERMISSIONS_CONTROLLER",
);
