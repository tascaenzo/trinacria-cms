import nodemailer from "nodemailer";
import type { EmailDeliveryConfig, MailSender, SendEmailInput } from "../email.types.js";
import type { EmailConfigService } from "./email-config.service.js";

export class EmailDeliveryDisabledError extends Error {
  readonly code = "email_delivery_disabled" as const;

  constructor() {
    super("Email delivery is disabled");
  }
}

export class EmailDeliveryConfigurationError extends Error {
  readonly code = "email_delivery_configuration_error" as const;

  constructor(message: string) {
    super(message);
  }
}

export class EmailDeliveryService {
  constructor(private readonly config: EmailConfigService) {}

  async send(input: SendEmailInput): Promise<void> {
    const config = await this.config.readConfig();
    const sender = createMailSender(config);
    await sender.send(input);
  }
}

function createMailSender(config: EmailDeliveryConfig): MailSender {
  if (config.provider === "disabled") {
    return new DisabledMailSender();
  }
  if (config.provider === "smtp") {
    return new SmtpMailSender(config);
  }
  return new ConsoleMailSender(config);
}

class DisabledMailSender implements MailSender {
  async send(): Promise<void> {
    throw new EmailDeliveryDisabledError();
  }
}

class ConsoleMailSender implements MailSender {
  constructor(private readonly config: EmailDeliveryConfig) {}

  async send(input: SendEmailInput): Promise<void> {
    console.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        service: "email-pack",
        event: "outbound_email",
        provider: "console",
        from: formatFrom(this.config),
        to: normalizeRecipients(input.to),
        replyTo: input.replyTo ?? this.config.replyTo,
        subject: input.subject,
        text: redactSensitiveEmailContent(input.text),
        ...(input.html ? { html: redactSensitiveEmailContent(input.html) } : {})
      })
    );
  }
}

class SmtpMailSender implements MailSender {
  constructor(private readonly config: EmailDeliveryConfig) {}

  async send(input: SendEmailInput): Promise<void> {
    const smtp = this.config.smtp;
    if (!smtp?.host) {
      throw new EmailDeliveryConfigurationError(
        "SMTP host is required when email provider is smtp"
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.username
        ? {
            user: smtp.username,
            pass: smtp.password ?? ""
          }
        : undefined
    });

    await transporter.sendMail({
      from: formatFrom(this.config),
      to: normalizeRecipients(input.to),
      replyTo: input.replyTo ?? this.config.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html
    });
  }
}

function formatFrom(config: EmailDeliveryConfig): string {
  const name = config.fromName?.trim();
  if (!name) {
    return config.fromAddress;
  }
  return `"${escapeMailHeaderValue(name)}" <${config.fromAddress}>`;
}

function redactSensitiveEmailContent(value: string): string {
  return value.replace(/([?&](?:token|code)=)[^\s&<"']+/giu, "$1[REDACTED]");
}

function escapeMailHeaderValue(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

function normalizeRecipients(value: string | readonly string[]): string | string[] {
  return typeof value === "string" ? value : [...value];
}
