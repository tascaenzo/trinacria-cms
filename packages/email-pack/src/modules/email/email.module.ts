import { classProvider, defineModule, type ModuleDefinition } from "@trinacria-cms/kernel";
import {
  CorePackRuntimeConfigModule,
  CorePackSettingsModule,
  RUNTIME_CONFIG_SERVICE_TOKEN,
  SETTINGS_SERVICE_TOKEN
} from "@trinacria-cms/core-pack";
import { EmailPackEmailTemplatesModule } from "../email-templates/email-templates.module.js";
import { EmailConfigService } from "./email-config.service.js";
import { EmailDeliveryService } from "./email-delivery.service.js";
import {
  EMAIL_PACK_EMAIL_CONFIG_SERVICE_TOKEN,
  EMAIL_PACK_EMAIL_DELIVERY_SERVICE_TOKEN
} from "./email.tokens.js";

export const EmailPackModule: ModuleDefinition = defineModule({
  name: "EmailPackModule",
  imports: [CorePackSettingsModule, CorePackRuntimeConfigModule, EmailPackEmailTemplatesModule],
  providers: [
    classProvider(EMAIL_PACK_EMAIL_CONFIG_SERVICE_TOKEN, EmailConfigService, [
      RUNTIME_CONFIG_SERVICE_TOKEN,
      SETTINGS_SERVICE_TOKEN
    ]),
    classProvider(EMAIL_PACK_EMAIL_DELIVERY_SERVICE_TOKEN, EmailDeliveryService, [
      EMAIL_PACK_EMAIL_CONFIG_SERVICE_TOKEN
    ])
  ],
  exports: [EMAIL_PACK_EMAIL_CONFIG_SERVICE_TOKEN, EMAIL_PACK_EMAIL_DELIVERY_SERVICE_TOKEN]
});
