import { createToken } from "@trinacria-cms/kernel";
import { ApiKeysController } from "./api-keys.controller.js";
import { ApiKeyHashingService } from "./api-key-hashing.service.js";
import { ApiKeysRepository } from "./api-keys.repository.js";
import { ApiKeysService } from "./api-keys.service.js";

export const API_KEYS_REPOSITORY_TOKEN =
  createToken<ApiKeysRepository>("CORE_PACK_API_KEYS_REPOSITORY");
export const API_KEYS_HASHING_SERVICE_TOKEN =
  createToken<ApiKeyHashingService>("CORE_PACK_API_KEYS_HASHING_SERVICE");
export const API_KEYS_SERVICE_TOKEN =
  createToken<ApiKeysService>("CORE_PACK_API_KEYS_SERVICE");
export const API_KEYS_CONTROLLER_TOKEN =
  createToken<ApiKeysController>("CORE_PACK_API_KEYS_CONTROLLER");
export const API_KEYS_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "CORE_PACK_API_KEYS_ENTITY_REGISTRATION",
);
