import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

export const EmailTemplateStatusSchema = s.enum(["active", "draft", "disabled"] as const);
export type EmailTemplateStatus = Infer<typeof EmailTemplateStatusSchema>;

export const EmailTemplateRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    key: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    locale: s.string({ trim: true, minLength: 2, maxLength: 12 }),
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    subject: s.string({ trim: true, minLength: 1, maxLength: 240 }),
    textBody: s.string({ minLength: 1, maxLength: 20000 }),
    htmlBody: s.string({ minLength: 1, maxLength: 40000 }).optional(),
    variables: s.array(s.string({ trim: true, minLength: 1, maxLength: 80 }), { unique: true }),
    status: EmailTemplateStatusSchema,
    source: s.enum(["seed", "custom"] as const),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type EmailTemplateRecord = Infer<typeof EmailTemplateRecordSchema>;

export const EMAIL_TEMPLATES_ENTITY = defineEntity({
  entityName: "email_templates",
  schema: EmailTemplateRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "email_templates_id_unique" },
    { fields: { key: 1, locale: 1 }, unique: true, name: "email_templates_key_locale_unique" },
    { fields: { status: 1 }, name: "email_templates_status_idx" },
    { fields: { updatedAt: -1 }, name: "email_templates_updated_at_desc_idx" }
  ] as const
});
