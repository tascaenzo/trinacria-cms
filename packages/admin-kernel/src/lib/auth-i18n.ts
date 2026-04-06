import en from "../i18n/en.json";
import it from "../i18n/it.json";
import type { SdkErrorDetails } from "./sdk-errors.js";
import { defineI18nBundle, type TranslateFn } from "./i18n.js";

export type SupportedLocale = "en" | "it";

const LOCALE_STORAGE_KEY = "trinacria.backoffice.locale";

export const officialI18nBundle = defineI18nBundle({
  pluginId: "kernel",
  dictionaries: {
    en,
    it
  }
});

export function normalizeLocale(value: string | null | undefined): SupportedLocale {
  if (!value) {
    return "en";
  }

  return value.toLowerCase().startsWith("it") ? "it" : "en";
}

export function readBackofficeLocale(): SupportedLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale) {
      return normalizeLocale(storedLocale);
    }
  } catch {
    // Ignore storage access failures and fall back to browser hints.
  }

  return normalizeLocale(document.documentElement.lang || window.navigator.language);
}

export function persistBackofficeLocale(locale: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore persistence failures and keep the in-memory locale.
  }
}

export function getLocalizedLoginError(
  error: SdkErrorDetails | null,
  t: TranslateFn
): string | null {
  if (!error) {
    return null;
  }

  if (error.code === "auth_invalid_credentials" || error.status === 401) {
    return t("auth.login.error.invalid_credentials");
  }
  if (error.code === "auth_forbidden_admin_required" || error.status === 403) {
    return t("auth.login.error.unauthorized");
  }
  if (error.code === "installation_not_completed") {
    return t("auth.login.error.installation_incomplete");
  }
  if (error.code === "validation_error") {
    return getSpecificErrorMessage(error) ?? t("auth.login.error.generic");
  }
  if (error.status && error.status >= 500) {
    return t("auth.login.error.server");
  }
  if (!error.status) {
    return t("auth.login.error.network");
  }
  return getSpecificErrorMessage(error) ?? t("auth.login.error.generic");
}

export function getLocalizedInstallationError(
  error: SdkErrorDetails | null,
  t: TranslateFn
): string | null {
  if (!error) {
    return null;
  }

  if (error.code === "installation_already_completed" || error.status === 409) {
    return t("auth.installation.error.already_completed");
  }
  if (error.code === "validation_error") {
    return getSpecificErrorMessage(error) ?? t("auth.installation.error.generic");
  }
  if (error.status && error.status >= 500) {
    return t("auth.installation.error.server");
  }
  if (!error.status) {
    return t("auth.installation.error.network");
  }
  return getSpecificErrorMessage(error) ?? t("auth.installation.error.generic");
}

function getSpecificErrorMessage(error: SdkErrorDetails): string | null {
  const message = error.message?.trim();
  if (!message) return null;
  if (message === "Schema validation failed") return null;
  if (/^HTTP \d+$/.test(message)) return null;
  return message;
}
