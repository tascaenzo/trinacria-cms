import { CorePackSettingsModule } from "@trinacria-cms/core-pack";
import {
  CORE_TOKENS,
  classProvider,
  defineModule,
  type EntityRegistry,
  factoryProvider,
  httpProvider,
  type ModuleDefinition
} from "@trinacria-cms/kernel";
import { EmailTemplatesController } from "./email-templates.controller.js";
import { EMAIL_TEMPLATES_ENTITY } from "./email-templates.schemas.js";
import {
  EMAIL_TEMPLATES_CONTROLLER_TOKEN,
  EMAIL_TEMPLATES_ENTITY_REGISTRATION_TOKEN,
  EMAIL_TEMPLATES_REPOSITORY_TOKEN,
  EMAIL_TEMPLATES_SERVICE_TOKEN
} from "./email-templates.tokens.js";
import { EmailTemplatesRepository } from "./repositories/email-templates.repository.js";
import { EmailTemplatesService } from "./services/email-templates.service.js";

export const EmailPackEmailTemplatesModule: ModuleDefinition = defineModule({
  name: "EmailPackEmailTemplatesModule",
  imports: [CorePackSettingsModule],
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
    ]),
    httpProvider(EMAIL_TEMPLATES_CONTROLLER_TOKEN, EmailTemplatesController, [
      EMAIL_TEMPLATES_SERVICE_TOKEN,
      CORE_TOKENS.KERNEL_ADMIN_ROUTE_GUARD
    ])
  ],
  exports: [
    EMAIL_TEMPLATES_CONTROLLER_TOKEN,
    EMAIL_TEMPLATES_ENTITY_REGISTRATION_TOKEN,
    EMAIL_TEMPLATES_REPOSITORY_TOKEN,
    EMAIL_TEMPLATES_SERVICE_TOKEN
  ]
});
