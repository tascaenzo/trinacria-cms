import { createToken } from "@trinacria-cms/kernel";
import type { ContentTypesController } from "./content-types.controller.js";
import type { ContentTypesRepository } from "./repositories/content-types.repository.js";
import type { ContentTypesService } from "./services/content-types.service.js";

export const CONTENT_TYPES_REPOSITORY_TOKEN = createToken<ContentTypesRepository>(
  "EDITORIAL_PACK_CONTENT_TYPES_REPOSITORY"
);
export const CONTENT_TYPES_SERVICE_TOKEN = createToken<ContentTypesService>(
  "EDITORIAL_PACK_CONTENT_TYPES_SERVICE"
);
export const CONTENT_TYPES_CONTROLLER_TOKEN = createToken<ContentTypesController>(
  "EDITORIAL_PACK_CONTENT_TYPES_CONTROLLER"
);
export const CONTENT_TYPES_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "EDITORIAL_PACK_CONTENT_TYPES_ENTITY_REGISTRATION"
);
