import { createToken } from "@trinacria-cms/kernel";
import { InstallationController } from "./installation.controller.js";
import { InstallationStateRepository } from "./repositories/installation-state.repository.js";
import { InstallationService } from "./services/installation.service.js";
import { LocalCredentialsRepository } from "./repositories/local-credentials.repository.js";
import { PasswordHashingService } from "./services/password-hashing.service.js";

export const INSTALLATION_STATE_REPOSITORY_TOKEN = createToken<InstallationStateRepository>(
  "CORE_PACK_INSTALLATION_STATE_REPOSITORY"
);
export const LOCAL_CREDENTIALS_REPOSITORY_TOKEN = createToken<LocalCredentialsRepository>(
  "CORE_PACK_LOCAL_CREDENTIALS_REPOSITORY"
);
export const PASSWORD_HASHING_SERVICE_TOKEN = createToken<PasswordHashingService>(
  "CORE_PACK_PASSWORD_HASHING_SERVICE"
);
export const CORE_PACK_INSTALLATION_SERVICE_TOKEN = createToken<InstallationService>(
  "CORE_PACK_INSTALLATION_SERVICE"
);
export const CORE_PACK_INSTALLATION_CONTROLLER_TOKEN = createToken<InstallationController>(
  "CORE_PACK_INSTALLATION_CONTROLLER"
);
export const CORE_PACK_INSTALLATION_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "CORE_PACK_INSTALLATION_ENTITY_REGISTRATION"
);
