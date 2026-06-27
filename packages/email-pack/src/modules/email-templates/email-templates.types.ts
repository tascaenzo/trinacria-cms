import type { EmailTemplateStatus } from "./email-templates.schemas.js";

export interface EmailTemplateSeed {
  key: string;
  locale: string;
  name: string;
  description?: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  variables: readonly string[];
}

export interface UpsertEmailTemplateInput extends EmailTemplateSeed {
  status?: EmailTemplateStatus;
}

export interface RenderEmailTemplateInput {
  key: string;
  locale?: string;
  fallbackLocale?: string;
  variables: Record<string, string | number | boolean | null | undefined>;
}

export interface RenderedEmailTemplate {
  templateKey: string;
  locale: string;
  subject: string;
  text: string;
  html?: string;
}
