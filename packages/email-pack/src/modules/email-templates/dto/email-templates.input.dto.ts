import { type Infer, s } from "@trinacria-cms/kernel";

export const UpsertEmailTemplateInputSchema = s.object(
  {
    key: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    locale: s.string({ trim: true, minLength: 2, maxLength: 20 }),
    name: s.string({ trim: true, minLength: 1, maxLength: 160 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    subject: s.string({ trim: true, minLength: 1, maxLength: 300 }),
    textBody: s.string({ minLength: 1, maxLength: 20000 }),
    htmlBody: s.string({ maxLength: 50000 }).optional(),
    variables: s.array(s.string({ trim: true, minLength: 1, maxLength: 120 })),
    status: s.enum(["active", "disabled"] as const).optional()
  },
  { strict: true }
);

export type UpsertEmailTemplateHttpInput = Infer<typeof UpsertEmailTemplateInputSchema>;

export const PreviewEmailTemplateInputSchema = s.object(
  {
    key: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    locale: s.string({ trim: true, minLength: 2, maxLength: 20 }).optional(),
    variables: s.record(
      s.string({ trim: true, minLength: 1, maxLength: 120 }),
      s.union([s.string(), s.number(), s.boolean()])
    )
  },
  { strict: true }
);

export type PreviewEmailTemplateInput = Infer<typeof PreviewEmailTemplateInputSchema>;
