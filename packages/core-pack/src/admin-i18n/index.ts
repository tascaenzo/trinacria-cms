import type { PluginTranslationSource } from "@trinacria-cms/kernel";
import en from "./en.json" with { type: "json" };
import it from "./it.json" with { type: "json" };

export type CorePackAdminLocale = "en" | "it";
export type CorePackAdminMessages = Readonly<Record<string, string>>;

/**
 * Canonical Backoffice dictionaries owned by Core Pack.
 *
 * They are referenced by the plugin manifest, persisted during provisioning, and
 * reused by the client only until the remote registry is available.
 */
export const CORE_PACK_ADMIN_I18N: Readonly<Record<CorePackAdminLocale, CorePackAdminMessages>> = {
  en,
  it
};

/** Package-local runtime assets; their message payload is never stored in the manifest. */
export const CORE_PACK_ADMIN_I18N_SOURCES: readonly PluginTranslationSource[] = [
  { source: "admin", locale: "en", messages: en },
  { source: "admin", locale: "it", messages: it }
];
