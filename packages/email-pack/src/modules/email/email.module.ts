import {
  CorePackRuntimeConfigModule,
  CorePackSettingsModule,
  RUNTIME_CONFIG_SERVICE_TOKEN,
  SETTINGS_SERVICE_TOKEN
} from "@trinacria-cms/core-pack/runtime";
import {
  CORE_TOKENS,
  classProvider,
  defineModule,
  factoryProvider,
  type ModuleDefinition
} from "@trinacria-cms/kernel";
import {
  createEmailDeliveryOperations,
  EMAIL_DELIVERY_OPERATIONS
} from "../../operations/email-operations.js";
import { EMAIL_OPERATIONS } from "../../plugin/email-pack.operations.js";
import { EmailPackEmailTemplatesModule } from "../email-templates/email-templates.module.js";
import {
  EMAIL_PACK_EMAIL_CONFIG_SERVICE_TOKEN,
  EMAIL_PACK_EMAIL_DELIVERY_SERVICE_TOKEN
} from "./email.tokens.js";
import { EmailConfigService } from "./services/email-config.service.js";
import { EmailDeliveryService } from "./services/email-delivery.service.js";

export const EmailPackModule: ModuleDefinition = defineModule({
  name: "EmailPackModule",
  imports: [CorePackSettingsModule, CorePackRuntimeConfigModule, EmailPackEmailTemplatesModule],
  providers: [
    factoryProvider(EMAIL_DELIVERY_OPERATIONS, createEmailDeliveryOperations, [
      EMAIL_PACK_EMAIL_DELIVERY_SERVICE_TOKEN,
      CORE_TOKENS.OPERATION_AUTHORIZER
    ]),
    EMAIL_OPERATIONS,
    classProvider(EMAIL_PACK_EMAIL_CONFIG_SERVICE_TOKEN, EmailConfigService, [
      RUNTIME_CONFIG_SERVICE_TOKEN,
      SETTINGS_SERVICE_TOKEN
    ]),
    classProvider(EMAIL_PACK_EMAIL_DELIVERY_SERVICE_TOKEN, EmailDeliveryService, [
      EMAIL_PACK_EMAIL_CONFIG_SERVICE_TOKEN
    ])
  ],
  exports: [
    EMAIL_DELIVERY_OPERATIONS,
    EMAIL_OPERATIONS.token,
    EMAIL_PACK_EMAIL_CONFIG_SERVICE_TOKEN,
    EMAIL_PACK_EMAIL_DELIVERY_SERVICE_TOKEN
  ]
});
