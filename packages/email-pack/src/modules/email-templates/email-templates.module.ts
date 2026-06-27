import {
  classProvider,
  CORE_TOKENS,
  defineModule,
  factoryProvider,
  type EntityRegistry
} from "@trinacria-cms/kernel";
import { EMAIL_TEMPLATES_ENTITY } from "./email-templates.schemas.js";
import { EmailTemplatesRepository } from "./email-templates.repository.js";
import { EmailTemplatesService } from "./email-templates.service.js";
import {
  EMAIL_TEMPLATES_ENTITY_REGISTRATION_TOKEN,
  EMAIL_TEMPLATES_REPOSITORY_TOKEN,
  EMAIL_TEMPLATES_SERVICE_TOKEN
} from "./email-templates.tokens.js";

export const EmailPackEmailTemplatesModule = defineModule({
  name: "EmailPackEmailTemplatesModule",
  providers: [
    factoryProvider(
      EMAIL_TEMPLATES_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        (registry as EntityRegistry).register(EMAIL_TEMPLATES_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(EMAIL_TEMPLATES_REPOSITORY_TOKEN, EmailTemplatesRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(EMAIL_TEMPLATES_SERVICE_TOKEN, EmailTemplatesService, [
      EMAIL_TEMPLATES_REPOSITORY_TOKEN
    ])
  ],
  exports: [
    EMAIL_TEMPLATES_ENTITY_REGISTRATION_TOKEN,
    EMAIL_TEMPLATES_REPOSITORY_TOKEN,
    EMAIL_TEMPLATES_SERVICE_TOKEN
  ]
});
