import { createCapabilityToken, createToken } from "@trinacria-cms/kernel";
import { EmailTemplatesRepository } from "./email-templates.repository.js";
import { EmailTemplatesService } from "./email-templates.service.js";
import { EmailTemplatesController } from "./email-templates.controller.js";

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
