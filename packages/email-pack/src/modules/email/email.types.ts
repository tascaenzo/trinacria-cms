export type EmailProvider = "disabled" | "console" | "smtp";

export interface SendEmailInput {
  to: string | readonly string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface MailSender {
  send(input: SendEmailInput): Promise<void>;
}

export interface EmailDeliveryConfig {
  provider: EmailProvider;
  fromAddress: string;
  fromName?: string;
  replyTo?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    username?: string;
    password?: string;
  };
}
