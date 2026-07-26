import { createToken } from "@trinacria-cms/kernel";
import type { I18nController } from "./i18n.controller.js";
import type { I18nMessagesRepository } from "./i18n-messages.repository.js";
import type { I18nMessagesService } from "./i18n-messages.service.js";

export const I18N_MESSAGES_ENTITY_REGISTRATION_TOKEN = createToken<boolean>("I18N_MESSAGES_ENTITY");
export const I18N_MESSAGES_REPOSITORY_TOKEN = createToken<I18nMessagesRepository>(
  "I18N_MESSAGES_REPOSITORY"
);
export const I18N_MESSAGES_SERVICE_TOKEN =
  createToken<I18nMessagesService>("I18N_MESSAGES_SERVICE");
export const I18N_CONTROLLER_TOKEN = createToken<I18nController>("I18N_CONTROLLER");
