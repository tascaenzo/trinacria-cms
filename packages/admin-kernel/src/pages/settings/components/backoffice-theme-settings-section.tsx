import {
  Button,
  FormSection,
  Panel,
  Select,
  SettingsSectionLayout,
  useToast
} from "@trinacria-cms/trinacria-ui";
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
  onDirtyChange,
  section,
  t
}: AdminSettingsSectionRenderContext) {
  const [theme, setTheme] = useState<BackofficeTheme>("light");
  const [accent, setAccent] = useState<BackofficeAccent>("neutral");
  const [savedTheme, setSavedTheme] = useState<BackofficeTheme>("light");
  const [savedAccent, setSavedAccent] = useState<BackofficeAccent>("neutral");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();
  const isDirty = theme !== savedTheme || accent !== savedAccent;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

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
        const nextTheme = normalizeBackofficeTheme(themeResponse.data?.value);
        const nextAccent = normalizeBackofficeAccent(accentResponse.data?.value);
        setTheme(nextTheme);
        setAccent(nextAccent);
        setSavedTheme(nextTheme);
        setSavedAccent(nextAccent);
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
      setSavedTheme(theme);
      setSavedAccent(accent);
      pushToast({
        tone: "success",
        title: t("common.actions.save", "Salva"),
        description: t("settings.backoffice_theme.saved", "Tema del backoffice salvato."),
        duration: 4000
      });
    } catch (currentError) {
      const message = toDisplayError(currentError);
      setError(message);
      pushToast({
        tone: "danger",
        title: "Salvataggio non riuscito",
        description: message,
        duration: 0
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SettingsSectionLayout title={section.title} description={section.summary}>
        <EmptyState text={t("settings.empty.loading_value", "Caricamento valore...")} />
      </SettingsSectionLayout>
    );
  }

  return (
    <SettingsSectionLayout
      title={section.title}
      description={section.summary}
      feedback={error ? <ErrorBanner message={error} /> : undefined}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={isSaving || !isDirty}
            onClick={() => {
              setTheme(savedTheme);
              setAccent(savedAccent);
              setError(null);
            }}
          >
            {t("common.actions.reset", "Ripristina")}
          </Button>
          <Button
            type="button"
            isLoading={isSaving}
            disabled={isSaving || !isDirty}
            onClick={() => void saveThemeSettings()}
          >
            {t("common.actions.save", "Salva")}
          </Button>
        </>
      }
    >
      <FormSection
        headingLevel={3}
        variant="plain"
        title={t("settings.backoffice_theme.appearance", "Aspetto")}
        description={t(
          "settings.backoffice_theme.appearance_hint",
          "Scegli il tema e il colore principale usati da tutti gli operatori."
        )}
      >
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
      </FormSection>

      <FormSection
        headingLevel={3}
        variant="plain"
        title={t("settings.backoffice_theme.preview", "Anteprima")}
        description={t(
          "settings.backoffice_theme.preview_hint",
          "La scelta verrà applicata a tutto il backoffice dopo il salvataggio."
        )}
      >
        <Panel
          data-trinacria-admin-theme="preview"
          data-theme={theme}
          data-accent={accent}
          className="p-4"
        >
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">Trinacria CMS</p>
          <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
            {t("settings.backoffice_theme.preview_copy", "Esempio di contenuto del backoffice.")}
          </p>
          <Button className="mt-4" disabled>
            {t("settings.backoffice_theme.example_action", "Azione principale")}
          </Button>
        </Panel>
      </FormSection>
    </SettingsSectionLayout>
  );
}
