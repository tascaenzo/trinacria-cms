import { CORE_TOKENS } from "@trinacria-cms/kernel";
import type {
  KernelPluginDefinition,
  KernelPluginEventHandler,
  SecureEventPayloadReadyEvent
} from "@trinacria-cms/kernel/contracts";
import { EmailPackModule } from "../modules/email/email.module.js";
import type { EmailDeliveryService } from "../modules/email/services/email-delivery.service.js";
import {
  EMAIL_SEND_REQUEST_PAYLOAD_TYPE,
  EMAIL_SEND_REQUEST_SCHEMA_VERSION,
  type EmailSendRequestPayload
} from "../modules/email/email-request.types.js";
import { EMAIL_PACK_EMAIL_DELIVERY_SERVICE_TOKEN } from "../modules/email/email.tokens.js";
import { EMAIL_TEMPLATES_SERVICE_TOKEN } from "../modules/email-templates/email-templates.tokens.js";
import { EMAIL_PACK_PLUGIN_ID } from "./email-pack.constants.js";
import { EMAIL_PACK_MANIFEST } from "./email-pack.manifest.js";
import { EMAIL_PACK_PERMISSION_KEYS } from "./email-pack.security.js";

export function createEmailPackPlugin(): KernelPluginDefinition {
  return {
    manifest: EMAIL_PACK_MANIFEST,
    modules: [EmailPackModule],
    async onLoad(context) {
      const templates = await context.app.resolve(EMAIL_TEMPLATES_SERVICE_TOKEN);
      await templates.seedDefaults();
    },
    eventHandlers: {
      deliverEmailRequest
    }
  };
}

const deliverEmailRequest: KernelPluginEventHandler = async (payload, _envelope, context) => {
  const event = readSecureEventPayload(payload);
  if (event.payloadType !== EMAIL_SEND_REQUEST_PAYLOAD_TYPE) {
    return;
  }

  const payloads = await context.app.resolve(CORE_TOKENS.SECURE_EVENT_PAYLOAD_STORE);
  const delivery = await context.app.resolve<EmailDeliveryService>(
    EMAIL_PACK_EMAIL_DELIVERY_SERVICE_TOKEN
  );
  const claimed = await payloads.claim<EmailSendRequestPayload>({
    payloadId: event.securePayloadId,
    consumerPluginId: EMAIL_PACK_PLUGIN_ID,
    eventName: context.eventName,
    payloadType: EMAIL_SEND_REQUEST_PAYLOAD_TYPE,
    schemaVersion: EMAIL_SEND_REQUEST_SCHEMA_VERSION,
    requiredPermission: EMAIL_PACK_PERMISSION_KEYS.EMAIL_SEND
  });

  await delivery.send(await resolveEmailSendInput(claimed.payload, context));
};

async function resolveEmailSendInput(
  payload: EmailSendRequestPayload,
  context: Parameters<KernelPluginEventHandler>[2]
) {
  if (payload.templateKey) {
    const templates = await context.app.resolve(EMAIL_TEMPLATES_SERVICE_TOKEN);
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

function readSecureEventPayload(payload: unknown): SecureEventPayloadReadyEvent {
  if (!payload || typeof payload !== "object") {
    throw new Error("Secure event payload notification must be an object");
  }
  const event = payload as Partial<SecureEventPayloadReadyEvent>;
  if (typeof event.securePayloadId !== "string" || event.securePayloadId.trim().length === 0) {
    throw new Error("Secure event payload notification is missing securePayloadId");
  }
  if (typeof event.payloadType !== "string" || event.payloadType.trim().length === 0) {
    throw new Error("Secure event payload notification is missing payloadType");
  }
  if (event.schemaVersion !== EMAIL_SEND_REQUEST_SCHEMA_VERSION) {
    throw new Error("Unsupported email send request schema version");
  }
  return {
    securePayloadId: event.securePayloadId.trim(),
    payloadType: event.payloadType.trim().toLowerCase(),
    schemaVersion: event.schemaVersion
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
