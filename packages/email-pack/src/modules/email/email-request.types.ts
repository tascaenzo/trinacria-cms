export const EMAIL_SEND_REQUEST_PAYLOAD_TYPE = "email-pack:send-email-request" as const;
export const EMAIL_SEND_REQUEST_SCHEMA_VERSION = 1 as const;

export interface EmailSendRequestPayload {
  to: string | readonly string[];
  templateKey?: string;
  locale?: string;
  variables?: Record<string, string | number | boolean | null | undefined>;
  subject?: string;
  text?: string;
  html?: string;
  replyTo?: string;
}
