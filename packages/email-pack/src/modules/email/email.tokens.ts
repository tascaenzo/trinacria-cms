import { createCapabilityToken, createToken } from "@trinacria-cms/kernel";
import type { EmailConfigService } from "./email-config.service.js";
import type { EmailDeliveryService } from "./email-delivery.service.js";

export const EMAIL_PACK_EMAIL_CONFIG_SERVICE_TOKEN = createToken<EmailConfigService>(
  "EMAIL_PACK_EMAIL_CONFIG_SERVICE"
);

export const EMAIL_PACK_EMAIL_DELIVERY_SERVICE_TOKEN = createCapabilityToken<EmailDeliveryService>(
  "email-pack.email.delivery.service"
);
