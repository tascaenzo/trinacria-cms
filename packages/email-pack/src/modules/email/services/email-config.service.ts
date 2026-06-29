import type { RuntimeConfigService, SettingsService } from "@trinacria-cms/core-pack";
import { EMAIL_PACK_PLUGIN_ID } from "../../../plugin/email-pack.constants.js";
import type { EmailDeliveryConfig, EmailProvider } from "../email.types.js";

const KEY_PREFIX = `${EMAIL_PACK_PLUGIN_ID}:email`;
const EMAIL_PROVIDER_KEY = `${KEY_PREFIX}:provider`;
const EMAIL_FROM_ADDRESS_KEY = `${KEY_PREFIX}:from_address`;
const EMAIL_FROM_NAME_KEY = `${KEY_PREFIX}:from_name`;
const EMAIL_REPLY_TO_KEY = `${KEY_PREFIX}:reply_to`;
const EMAIL_SMTP_HOST_KEY = `${KEY_PREFIX}:smtp_host`;
const EMAIL_SMTP_PORT_KEY = `${KEY_PREFIX}:smtp_port`;
const EMAIL_SMTP_SECURE_KEY = `${KEY_PREFIX}:smtp_secure`;
const EMAIL_SMTP_USERNAME_KEY = `${KEY_PREFIX}:smtp_username`;
const EMAIL_SMTP_PASSWORD_KEY = `${KEY_PREFIX}:smtp_password`;

const EMAIL_PROVIDERS = new Set<EmailProvider>(["disabled", "console", "smtp"]);

export class EmailConfigService {
  constructor(
    private readonly config: RuntimeConfigService,
    private readonly settings: SettingsService
  ) {}

  async readConfig(): Promise<EmailDeliveryConfig> {
    const provider = normalizeProvider(await this.readString(EMAIL_PROVIDER_KEY, "console"));
    const fromAddress =
      (await this.readString(EMAIL_FROM_ADDRESS_KEY, "no-reply@localhost")) ?? "no-reply@localhost";
    const fromName = await this.readString(EMAIL_FROM_NAME_KEY, "Trinacria CMS");
    const replyTo = await this.readOptionalString(EMAIL_REPLY_TO_KEY);
    const smtpHost = await this.readOptionalString(EMAIL_SMTP_HOST_KEY);
    const smtpPort = await this.config.getNumber(EMAIL_SMTP_PORT_KEY, {
      fallback: 587,
      min: 1,
      max: 65535
    });
    const smtpSecure = await this.config.getBoolean(EMAIL_SMTP_SECURE_KEY, { fallback: false });
    const smtpUsername = await this.readOptionalString(EMAIL_SMTP_USERNAME_KEY);
    const password = await this.readSmtpPassword();

    return {
      provider,
      fromAddress,
      ...(fromName ? { fromName } : {}),
      ...(replyTo ? { replyTo } : {}),
      smtp: {
        host: smtpHost ?? "",
        port: smtpPort ?? 587,
        secure: smtpSecure ?? false,
        ...(smtpUsername ? { username: smtpUsername } : {}),
        ...(password ? { password } : {})
      }
    };
  }

  private async readString(key: string, fallback: string): Promise<string | undefined> {
    return this.config.getString(key, { fallback });
  }

  private async readOptionalString(key: string): Promise<string | undefined> {
    const value = await this.config.getString(key, { fallback: "" });
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private async readSmtpPassword(): Promise<string | undefined> {
    try {
      const secret = await this.settings.revealSecret(
        EMAIL_PACK_PLUGIN_ID,
        EMAIL_SMTP_PASSWORD_KEY
      );
      const value = secret?.value.trim();
      return value ? value : undefined;
    } catch {
      return undefined;
    }
  }
}

function normalizeProvider(value: string | undefined): EmailProvider {
  const normalized = value?.trim().toLowerCase();
  if (normalized && EMAIL_PROVIDERS.has(normalized as EmailProvider)) {
    return normalized as EmailProvider;
  }
  return "console";
}
