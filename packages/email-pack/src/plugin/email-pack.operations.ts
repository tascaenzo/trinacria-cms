import { createToken, s } from "@trinacria-cms/kernel";
import type { PluginOperationsProvider } from "@trinacria-cms/kernel/plugin-api";
import {
  createSystemOperationContext,
  pluginOperationsProvider
} from "@trinacria-cms/kernel/runtime";
import type { EmailSendRequestPayload } from "../modules/email/email-request.types.js";
import { EMAIL_TEMPLATES_SERVICE_TOKEN } from "../modules/email-templates/email-templates.tokens.js";
import type { EmailTemplatesService } from "../modules/email-templates/services/email-templates.service.js";
import {
  EMAIL_DELIVERY_OPERATIONS,
  type EmailDeliveryOperations
} from "../operations/email-operations.js";
import { EMAIL_PACK_PLUGIN_ID } from "./email-pack.constants.js";
import { EMAIL_PACK_PERMISSION_KEYS } from "./email-pack.security.js";

export const EMAIL_OPERATIONS = pluginOperationsProvider(
  createToken<PluginOperationsProvider>("EMAIL_OPERATIONS"),
  EMAIL_PACK_PLUGIN_ID,
  (templates: EmailTemplatesService, delivery: EmailDeliveryOperations) => [
    {
      name: "send",
      requiredPermission: "email-pack:email:send",
      input: s.object(
        {
          to: s.union([s.string(), s.array(s.string())]),
          subject: s.string(),
          text: s.string(),
          html: s.string().optional(),
          replyTo: s.string().optional()
        },
        { strict: true }
      ),
      invoke: (input, context) =>
        delivery.send(
          context.operationContext,
          input as import("../modules/email/email.types.js").SendEmailInput
        )
    },
    {
      name: "initialize",
      private: true,
      input: s.object({}),
      async invoke() {
        await templates.seedDefaults();
        return null;
      }
    },
    {
      name: "send-job",
      private: true,
      input: s.object(
        {
          payload: s.object(
            {
              to: s.union([s.string(), s.array(s.string())]),
              templateKey: s.string().optional(),
              locale: s.string().optional(),
              variables: s
                .record(s.string(), s.union([s.string(), s.number(), s.boolean()]).nullable())
                .optional(),
              subject: s.string().optional(),
              text: s.string().optional(),
              html: s.string().optional(),
              replyTo: s.string().optional()
            },
            { strict: true }
          ),
          messageId: s
            .string({ maxLength: 100 })
            .refine(
              (value) => /^<[a-f0-9]{64}@trinacria\.invalid>$/.test(value),
              "Invalid durable Message-ID"
            )
        },
        { strict: true }
      ),
      async invoke(input) {
        const job = input as { payload: EmailSendRequestPayload; messageId: string };
        await delivery.send(
          createSystemOperationContext("secure-email-delivery", [
            { ownerPluginId: "email-pack", resource: "email", action: "send" }
          ]),
          {
            ...(await resolveEmailSendInput(job.payload, templates)),
            messageId: job.messageId
          }
        );
        return null;
      }
    }
  ],
  [EMAIL_TEMPLATES_SERVICE_TOKEN, EMAIL_DELIVERY_OPERATIONS]
);

async function resolveEmailSendInput(
  payload: EmailSendRequestPayload,
  templates: import("../modules/email-templates/services/email-templates.service.js").EmailTemplatesService
) {
  if (payload.templateKey) {
    const rendered = await templates.render({
      key: payload.templateKey,
      locale: payload.locale ?? "it",
      variables: payload.variables ?? {}
    });
    return {
      to: normalizeRecipients(payload.to),
      subject: rendered.subject,
      text: rendered.text,
      ...(rendered.html ? { html: rendered.html } : {}),
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {})
    };
  }

  if (!payload.subject || !payload.text) {
    throw new Error("Email send request requires templateKey or subject/text");
  }
  return {
    to: normalizeRecipients(payload.to),
    subject: payload.subject,
    text: payload.text,
    ...(payload.html ? { html: payload.html } : {}),
    ...(payload.replyTo ? { replyTo: payload.replyTo } : {})
  };
}

function normalizeRecipients(value: string | readonly string[]): string[] {
  const values = typeof value === "string" ? [value] : [...value];
  const recipients = values.map((item) => item.trim()).filter(Boolean);
  if (recipients.length === 0) {
    throw new Error("Email send request requires at least one recipient");
  }
  return recipients;
}
