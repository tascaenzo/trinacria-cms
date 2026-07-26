import { defineEntity, type Infer, s } from "@trinacria-cms/kernel";

const LocaleSchema = s
  .string({ trim: true, minLength: 2, maxLength: 35 })
  .refine((value) => /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(value), "Invalid locale");

/** One small, independently updatable message imported from a plugin package asset. */
export const TranslationMessageRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    pluginId: s.string({ trim: true, toLowerCase: true, minLength: 1, maxLength: 120 }),
    namespace: s.string({ trim: true, minLength: 1, maxLength: 80 }),
    surface: s.string({ trim: true, minLength: 1, maxLength: 80 }),
    source: s.string({ trim: true, minLength: 1, maxLength: 80 }),
    locale: LocaleSchema,
    key: s
      .string({ trim: true, minLength: 1, maxLength: 240 })
      .refine((value) => /^[a-z0-9][a-z0-9._-]*$/.test(value), "Invalid message key"),
    value: s.string({ minLength: 1, maxLength: 4000 }),
    sourceVersion: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type TranslationMessageRecord = Infer<typeof TranslationMessageRecordSchema>;

/** Central registry of granular plugin translations. */
export const I18N_MESSAGES_ENTITY = defineEntity({
  entityName: "i18n_messages",
  schema: TranslationMessageRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "i18n_messages_id_unique" },
    {
      fields: { pluginId: 1, namespace: 1, locale: 1, key: 1 },
      unique: true,
      name: "i18n_messages_plugin_namespace_locale_key_unique"
    },
    {
      fields: { namespace: 1, surface: 1, locale: 1 },
      name: "i18n_messages_namespace_surface_locale_idx"
    }
  ] as const
});
