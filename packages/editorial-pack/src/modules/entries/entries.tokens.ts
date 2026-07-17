import { createToken } from "@trinacria-cms/kernel";
import type { EntriesController } from "./entries.controller.js";
import type { EntriesRepository } from "./repositories/entries.repository.js";
import type { EntriesService } from "./services/entries.service.js";

export const ENTRIES_REPOSITORY_TOKEN = createToken<EntriesRepository>(
  "EDITORIAL_PACK_ENTRIES_REPOSITORY"
);
export const ENTRIES_SERVICE_TOKEN = createToken<EntriesService>("EDITORIAL_PACK_ENTRIES_SERVICE");
export const ENTRIES_CONTROLLER_TOKEN = createToken<EntriesController>(
  "EDITORIAL_PACK_ENTRIES_CONTROLLER"
);
export const ENTRIES_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "EDITORIAL_PACK_ENTRIES_ENTITY_REGISTRATION"
);
