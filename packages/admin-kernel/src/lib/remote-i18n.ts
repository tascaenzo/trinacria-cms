import { getBackofficeApiBaseUrl } from "../runtime/cms-sdk.js";
import type { I18nBundle, Locale, TranslationDictionary } from "./i18n.js";

interface RemoteI18nPayload {
  data?: {
    locale?: unknown;
    messages?: unknown;
  };
}

function isTranslationDictionary(value: unknown): value is TranslationDictionary {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every((message) => typeof message === "string")
  );
}

/** Converts the Core i18n response to the Backoffice bundle contract. */
export function createRemoteI18nBundle(payload: unknown): I18nBundle | null {
  const response = payload as RemoteI18nPayload;
  const locale = response.data?.locale;
  const messages = response.data?.messages;
  if (typeof locale !== "string" || !isTranslationDictionary(messages)) return null;

  return {
    pluginId: "cms-runtime",
    dictionaries: { [locale]: messages }
  };
}

/**
 * Loads all installed plugin dictionaries intended for the admin surface.
 * The Core Pack catalog remains available only as a bootstrap and offline fallback.
 */
export async function loadRemoteBackofficeI18n(
  locale: Locale,
  options: { signal?: AbortSignal; fetchFn?: typeof fetch } = {}
): Promise<I18nBundle | null> {
  const fetchFn = options.fetchFn ?? fetch;
  const params = new URLSearchParams({ surface: "admin" });
  const response = await fetchFn(
    `${getBackofficeApiBaseUrl()}/v1/i18n/${encodeURIComponent(locale)}?${params.toString()}`,
    { credentials: "include", signal: options.signal }
  );
  if (!response.ok) {
    throw new Error(`Unable to load backoffice translations (${response.status})`);
  }
  return createRemoteI18nBundle(await response.json());
}
