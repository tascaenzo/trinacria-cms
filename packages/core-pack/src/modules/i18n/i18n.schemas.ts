import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

const LocaleSchema = s
  .string({ trim: true, minLength: 2, maxLength: 35 })
  .refine((value) => /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(value), "Invalid locale");

export const TranslationBundleRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    pluginId: s.string({ trim: true, toLowerCase: true, minLength: 1, maxLength: 120 }),
    /** Canonical `<pluginId>:<namespace>` target for API clients and AI tools. */
    namespace: s.string({ trim: true, minLength: 3, maxLength: 220 }),
    locale: LocaleSchema,
    fallbackLocale: s.literal("en"),
    messages: s.record(
      s.string({ trim: true, minLength: 1, maxLength: 240 }),
      s.string({ minLength: 1, maxLength: 4000 })
    ),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type TranslationBundleRecord = Infer<typeof TranslationBundleRecordSchema>;

/** Persisted, plugin-owned UI translation bundles. */
export const I18N_BUNDLES_ENTITY = defineEntity({
  entityName: "i18n_bundles",
  schema: TranslationBundleRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "i18n_bundles_id_unique" },
    {
      fields: { pluginId: 1, namespace: 1, locale: 1 },
      unique: true,
      name: "i18n_bundles_plugin_namespace_locale_unique"
    },
    { fields: { namespace: 1, locale: 1 }, name: "i18n_bundles_namespace_locale_idx" }
  ] as const
});
