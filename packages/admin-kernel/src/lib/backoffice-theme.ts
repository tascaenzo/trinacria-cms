export const BACKOFFICE_THEME_SETTING_KEY = "core-pack:branding:backoffice_theme";
export const BACKOFFICE_ACCENT_SETTING_KEY = "core-pack:branding:backoffice_accent";

export const BACKOFFICE_THEME_OPTIONS = ["light", "dark"] as const;
export const BACKOFFICE_ACCENT_OPTIONS = ["neutral", "trinacria", "ocean", "forest"] as const;

export type BackofficeTheme = (typeof BACKOFFICE_THEME_OPTIONS)[number];
export type BackofficeAccent = (typeof BACKOFFICE_ACCENT_OPTIONS)[number];

export function normalizeBackofficeTheme(value: unknown): BackofficeTheme {
  return value === "dark" ? "dark" : "light";
}

export function normalizeBackofficeAccent(value: unknown): BackofficeAccent {
  return BACKOFFICE_ACCENT_OPTIONS.includes(value as BackofficeAccent)
    ? (value as BackofficeAccent)
    : "neutral";
}

export function applyBackofficeTheme(theme: unknown, accent: unknown): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.trinacriaAdminTheme = "enabled";
  root.dataset.theme = normalizeBackofficeTheme(theme);
  root.dataset.accent = normalizeBackofficeAccent(accent);
}
