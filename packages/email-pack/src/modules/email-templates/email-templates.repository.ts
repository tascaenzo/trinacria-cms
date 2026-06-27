import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { EMAIL_PACK_PLUGIN_ID } from "../../plugin/email-pack.constants.js";
import {
  EmailTemplateRecordSchema,
  type EmailTemplateRecord,
  type EmailTemplateStatus
} from "./email-templates.schemas.js";
import type { EmailTemplateSeed, UpsertEmailTemplateInput } from "./email-templates.types.js";

const EMAIL_TEMPLATES_ENTITY_NAME = "email_templates";

export class EmailTemplatesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async seedDefaults(seeds: readonly EmailTemplateSeed[]): Promise<readonly EmailTemplateRecord[]> {
    const created: EmailTemplateRecord[] = [];
    for (const seed of seeds) {
      const existing = await this.findByKeyAndLocale(seed.key, seed.locale);
      if (existing) continue;
      created.push(await this.create({ ...seed, status: "active" }));
    }
    return created;
  }

  async create(input: UpsertEmailTemplateInput): Promise<EmailTemplateRecord> {
    const now = new Date().toISOString();
    const created = await this.repository().insertOne({
      key: normalizeTemplateKey(input.key),
      locale: normalizeLocale(input.locale),
      name: input.name.trim(),
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
      subject: input.subject.trim(),
      textBody: input.textBody,
      ...(input.htmlBody?.trim() ? { htmlBody: input.htmlBody } : {}),
      variables: normalizeVariables(input.variables),
      status: input.status ?? "active",
      source: "seed",
      createdAt: now,
      updatedAt: now
    });
    return EmailTemplateRecordSchema.parse(created);
  }

  async findByKeyAndLocale(key: string, locale: string): Promise<EmailTemplateRecord | null> {
    return this.repository().findOne({
      filter: { key: normalizeTemplateKey(key), locale: normalizeLocale(locale) },
      parse: (value: unknown) => EmailTemplateRecordSchema.parse(value)
    });
  }

  async list(options?: {
    status?: EmailTemplateStatus;
    limit?: number;
    offset?: number;
  }): Promise<readonly EmailTemplateRecord[]> {
    return this.repository().findMany({
      filter: options?.status ? { status: options.status } : undefined,
      limit: options?.limit,
      offset: options?.offset,
      sort: { updatedAt: "desc" },
      parse: (value: unknown) => EmailTemplateRecordSchema.parse(value)
    });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, EMAIL_PACK_PLUGIN_ID);
    return this.scope.repository<EmailTemplateRecord>(EMAIL_TEMPLATES_ENTITY_NAME);
  }
}

function normalizeTemplateKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_");
}

function normalizeLocale(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeVariables(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}
