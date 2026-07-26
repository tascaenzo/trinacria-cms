import { createCapabilityToken, createToken } from "@trinacria-cms/kernel";
import type { EmailTemplatesController } from "./email-templates.controller.js";
import type { EmailTemplatesRepository } from "./repositories/email-templates.repository.js";
import type { EmailTemplatesService } from "./services/email-templates.service.js";

export const EMAIL_TEMPLATES_REPOSITORY_TOKEN = createToken<EmailTemplatesRepository>(
  "EMAIL_PACK_EMAIL_TEMPLATES_REPOSITORY"
);
export const EMAIL_TEMPLATES_SERVICE_TOKEN =
  createCapabilityToken<EmailTemplatesService>("email-templates.service");
export const EMAIL_TEMPLATES_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "EMAIL_PACK_EMAIL_TEMPLATES_ENTITY_REGISTRATION"
);
export const EMAIL_TEMPLATES_CONTROLLER_TOKEN = createToken<EmailTemplatesController>(
  "EMAIL_PACK_EMAIL_TEMPLATES_CONTROLLER"
);
