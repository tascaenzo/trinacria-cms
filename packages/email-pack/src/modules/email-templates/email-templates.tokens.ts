import { createCapabilityToken, createToken } from "@trinacria-cms/kernel";
import { EmailTemplatesRepository } from "./email-templates.repository.js";
import { EmailTemplatesService } from "./email-templates.service.js";

export const EMAIL_TEMPLATES_REPOSITORY_TOKEN = createToken<EmailTemplatesRepository>(
  "EMAIL_PACK_EMAIL_TEMPLATES_REPOSITORY"
);
export const EMAIL_TEMPLATES_SERVICE_TOKEN =
  createCapabilityToken<EmailTemplatesService>("email-templates.service");
export const EMAIL_TEMPLATES_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "EMAIL_PACK_EMAIL_TEMPLATES_ENTITY_REGISTRATION"
);
