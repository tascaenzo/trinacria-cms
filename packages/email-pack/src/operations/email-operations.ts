import { CoreError, createToken } from "@trinacria-cms/kernel";
import type { ApplicationOperations, OperationAuthorizer } from "@trinacria-cms/kernel/contracts";
import { createApplicationOperations } from "@trinacria-cms/kernel/runtime";
import type { SendEmailInput } from "../modules/email/email.types.js";
import type { EmailDeliveryService } from "../modules/email/services/email-delivery.service.js";
import type { EmailTemplatesService } from "../modules/email-templates/services/email-templates.service.js";
export type EmailTemplateOperations = ApplicationOperations<
  Pick<EmailTemplatesService, "listTemplates" | "getTemplate" | "upsertTemplate" | "render">
>;
export type EmailDeliveryOperations = ApplicationOperations<Pick<EmailDeliveryService, "send">>;
export const EMAIL_TEMPLATE_OPERATIONS = createToken<EmailTemplateOperations>(
  "EMAIL_TEMPLATE_OPERATIONS"
);
export const EMAIL_DELIVERY_OPERATIONS = createToken<EmailDeliveryOperations>(
  "EMAIL_DELIVERY_OPERATIONS"
);
export function createEmailTemplateOperations(
  service: EmailTemplatesService,
  authorizer: OperationAuthorizer
): EmailTemplateOperations {
  const read = { ownerPluginId: "email-pack", resource: "settings", action: "read" };
  return createApplicationOperations(service, authorizer, {
    listTemplates: { target: read },
    getTemplate: { target: read },
    render: { target: read },
    upsertTemplate: { target: { ...read, action: "write" } }
  });
}
export function createEmailDeliveryOperations(
  service: EmailDeliveryService,
  authorizer: OperationAuthorizer
): EmailDeliveryOperations {
  return createApplicationOperations(service, authorizer, {
    send: {
      target: { ownerPluginId: "email-pack", resource: "email", action: "send" },
      prepare: (args) => {
        const input = args[0] as SendEmailInput;
        const recipients = typeof input?.to === "string" ? [input.to] : input?.to;
        if (
          !Array.isArray(recipients) ||
          !recipients.length ||
          recipients.length > 100 ||
          recipients.some(
            (value) =>
              typeof value !== "string" ||
              value.length > 254 ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ) ||
          typeof input.subject !== "string" ||
          input.subject.length > 200 ||
          /[\r\n]/.test(input.subject) ||
          typeof input.text !== "string" ||
          Buffer.byteLength(input.text) > 1024 * 1024 ||
          (input.html !== undefined &&
            (typeof input.html !== "string" || Buffer.byteLength(input.html) > 1024 * 1024)) ||
          (input.replyTo !== undefined &&
            (typeof input.replyTo !== "string" || /[\r\n]/.test(input.replyTo)))
        )
          throw new CoreError("validation_error", "Invalid email delivery input");
        return [{ ...input, to: [...recipients] }];
      }
    }
  });
}
