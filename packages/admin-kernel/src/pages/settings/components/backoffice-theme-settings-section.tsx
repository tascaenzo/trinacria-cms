import { Button, Select } from "@trinacria-cms/trinacria-ui";
import { useEffect, useState } from "react";
import { EmptyState, ErrorBanner } from "../../../components/resource-feedback.js";
import {
  applyBackofficeTheme,
  BACKOFFICE_ACCENT_SETTING_KEY,
  BACKOFFICE_THEME_SETTING_KEY,
  type BackofficeAccent,
  type BackofficeTheme,
  normalizeBackofficeAccent,
  normalizeBackofficeTheme
} from "../../../lib/backoffice-theme.js";
import { toDisplayError } from "../../../lib/sdk-errors.js";
import type { AdminSettingsSectionRenderContext } from "../../../runtime/admin-route-runtime.js";

export function BackofficeThemeSettingsSection({
  cms,
  section,
  t
}: AdminSettingsSectionRenderContext) {
  const [theme, setTheme] = useState<BackofficeTheme>("light");
  const [accent, setAccent] = useState<BackofficeAccent>("neutral");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadThemeSettings() {
      try {
        setIsLoading(true);
        setError(null);
        const [themeResponse, accentResponse] = await Promise.all([
          cms.settings.getSettingValueByKey({ path: { key: BACKOFFICE_THEME_SETTING_KEY } }),
          cms.settings.getSettingValueByKey({ path: { key: BACKOFFICE_ACCENT_SETTING_KEY } })
        ]);
        if (isCancelled) return;
        setTheme(normalizeBackofficeTheme(themeResponse.data?.value));
        setAccent(normalizeBackofficeAccent(accentResponse.data?.value));
      } catch (currentError) {
        if (!isCancelled) {
          setError(toDisplayError(currentError));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadThemeSettings();
    return () => {
      isCancelled = true;
    };
  }, [cms]);

  async function saveThemeSettings() {
    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);
      await Promise.all([
        cms.settings.upsertSettingValue({
          path: { key: BACKOFFICE_THEME_SETTING_KEY },
          body: { value: theme, updatedBy: "backoffice" }
        }),
        cms.settings.upsertSettingValue({
          path: { key: BACKOFFICE_ACCENT_SETTING_KEY },
          body: { value: accent, updatedBy: "backoffice" }
        })
      ]);
      applyBackofficeTheme(theme, accent);
      setMessage(t("settings.backoffice_theme.saved", "Tema del backoffice salvato."));
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <EmptyState text={t("settings.empty.loading_value", "Caricamento valore...")} />
      </div>
    );
  }

  return (
    <div className="min-h-0 overflow-auto px-6 py-4 sm:px-8 sm:py-6">
      <div className="mx-auto grid max-w-2xl gap-6">
        <div className="grid gap-1">
          <h3 className="text-xl font-semibold text-[color:var(--color-ink)]">{section.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {section.summary}
          </p>
        </div>

        {error ? <ErrorBanner message={error} /> : null}
        {message ? (
          <p className="text-sm font-medium text-[color:var(--color-success-ink)]">{message}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t("settings.backoffice_theme.mode", "Modalità")}
            value={theme}
            disabled={isSaving}
            onChange={(event) => setTheme(normalizeBackofficeTheme(event.currentTarget.value))}
          >
            <option value="light">{t("settings.backoffice_theme.light", "Chiaro")}</option>
            <option value="dark">{t("settings.backoffice_theme.dark", "Scuro")}</option>
          </Select>
          <Select
            label={t("settings.backoffice_theme.accent", "Accento")}
            value={accent}
            disabled={isSaving}
            onChange={(event) => setAccent(normalizeBackofficeAccent(event.currentTarget.value))}
          >
            <option value="neutral">{t("settings.backoffice_theme.neutral", "Neutro")}</option>
            <option value="trinacria">
              {t("settings.backoffice_theme.trinacria", "Trinacria")}
            </option>
            <option value="ocean">{t("settings.backoffice_theme.ocean", "Oceano")}</option>
            <option value="forest">{t("settings.backoffice_theme.forest", "Foresta")}</option>
          </Select>
        </div>

        <div
          data-trinacria-admin-theme="preview"
          data-theme={theme}
          data-accent={accent}
          className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
        >
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
            {t("settings.backoffice_theme.preview", "Anteprima")}
          </p>
          <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
            {t(
              "settings.backoffice_theme.preview_hint",
              "La scelta verrà applicata a tutto il backoffice dopo il salvataggio."
            )}
          </p>
          <Button className="mt-4" disabled>
            {t("settings.backoffice_theme.example_action", "Azione principale")}
          </Button>
        </div>

        <div className="flex justify-end border-t border-[color:var(--color-border)] pt-4">
          <Button isLoading={isSaving} disabled={isSaving} onClick={() => void saveThemeSettings()}>
            {t("common.actions.save", "Salva")}
          </Button>
        </div>
      </div>
    </div>
  );
}
