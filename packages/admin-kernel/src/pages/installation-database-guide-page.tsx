import { AuthScreenLayout } from "../components/auth-screen-layout.js";
import { useI18n } from "../lib/i18n.js";

export interface InstallationDatabaseGuidePageProps {
  envFilePath?: string;
}

export function InstallationDatabaseGuidePage({ envFilePath }: InstallationDatabaseGuidePageProps) {
  const { t } = useI18n();

  return (
    <AuthScreenLayout
      variant="minimal"
      eyebrow={t("auth.installation.eyebrow")}
      heroTitle={t("auth.installation.db_guide_title")}
      heroBody={t("auth.installation.db_guide_body")}
      formTitle={t("auth.installation.db_guide_form_title")}
      formSummary={t("auth.installation.db_guide_form_summary")}
      formBadgeLabel={t("auth.installation.form_badge_label")}
      formBadgeHint={t("auth.installation.form_badge_hint")}
      heroMetrics={[]}
      heroHighlights={[]}
    >
      <div className="grid gap-4 text-sm text-[color:var(--color-ink-muted)]">
        <p>{t("auth.installation.db_guide_step_1")}</p>
        <pre className="overflow-auto rounded-[var(--radius-control)] border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-3 text-xs text-[color:var(--color-ink)]">
          {`MONGO_URI=mongodb://<host>:<port>/<database>
# oppure
MONGO_HOST=127.0.0.1
MONGO_PORT=27017
MONGO_DATABASE=trinacria_cms
# opzionale se Mongo usa auth:
MONGO_ROOT_USERNAME=<username>
MONGO_ROOT_PASSWORD=<password>`}
        </pre>
        <p>{t("auth.installation.db_guide_step_2")}</p>
        {envFilePath ? (
          <p className="rounded-[var(--radius-control)] border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] px-3 py-2 font-mono text-xs text-[color:var(--color-ink)]">
            {envFilePath}
          </p>
        ) : null}
        <p>{t("auth.installation.db_guide_step_3")}</p>
        <p className="rounded-[var(--radius-control)] border border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-bg)] px-3 py-2 text-xs font-medium text-[color:var(--color-accent-ink)]">
          {t("auth.installation.db_guide_restart_hint")}
        </p>
      </div>
    </AuthScreenLayout>
  );
}
