import { EMAIL_PACK_DEFAULT_EMAIL_TEMPLATES } from "./email-template-defaults.js";
import type { EmailTemplateRecord } from "./email-templates.schemas.js";
import { EmailTemplatesRepository } from "./email-templates.repository.js";
import type { RenderedEmailTemplate, RenderEmailTemplateInput } from "./email-templates.types.js";

const DEFAULT_LOCALE = "it";
const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export class EmailTemplatesService {
  constructor(private readonly repository: EmailTemplatesRepository) {}

  async seedDefaults(): Promise<readonly EmailTemplateRecord[]> {
    return this.repository.seedDefaults(EMAIL_PACK_DEFAULT_EMAIL_TEMPLATES);
  }

  async listTemplates(): Promise<readonly EmailTemplateRecord[]> {
    return this.repository.list();
  }

  async getTemplate(key: string, locale = DEFAULT_LOCALE): Promise<EmailTemplateRecord | null> {
    return this.repository.findByKeyAndLocale(key, locale);
  }

  async render(input: RenderEmailTemplateInput): Promise<RenderedEmailTemplate> {
    const locale = input.locale ?? DEFAULT_LOCALE;
    const fallbackLocale = input.fallbackLocale ?? DEFAULT_LOCALE;
    const template =
      (await this.repository.findByKeyAndLocale(input.key, locale)) ??
      (locale === fallbackLocale
        ? null
        : await this.repository.findByKeyAndLocale(input.key, fallbackLocale));

    if (!template || template.status !== "active") {
      throw new Error(`Active email template "${input.key}" not found for locale "${locale}"`);
    }

    return {
      templateKey: template.key,
      locale: template.locale,
      subject: renderTemplateString(template.subject, input.variables),
      text: renderTemplateString(template.textBody, input.variables),
      ...(template.htmlBody
        ? { html: renderTemplateString(template.htmlBody, input.variables) }
        : {})
    };
  }
}

function renderTemplateString(
  template: string,
  variables: RenderEmailTemplateInput["variables"]
): string {
  return template.replace(TEMPLATE_VARIABLE_PATTERN, (_match, key: string) =>
    stringifyVariable(variables[key])
  );
}

function stringifyVariable(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}
