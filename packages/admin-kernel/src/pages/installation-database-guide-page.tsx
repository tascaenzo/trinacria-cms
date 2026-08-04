import { FeedbackBanner, Panel } from "@trinacria-cms/trinacria-ui";
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
        <Panel
          as="pre"
          className="overflow-auto p-3 text-xs text-[color:var(--color-ink)]"
          tone="soft"
        >
          {`MONGO_URI=mongodb://<user>:<password>@<host>:<port>/<database>?authSource=admin

# Alternative fallback when MONGO_URI is not set:
# MONGO_HOST=127.0.0.1
# MONGO_PORT=27017
# MONGO_DATABASE=trinacria_cms
# MONGO_ROOT_USERNAME=<username>
# MONGO_ROOT_PASSWORD=<password>`}
        </Panel>
        <p>{t("auth.installation.db_guide_step_2")}</p>
        {envFilePath ? (
          <Panel
            as="pre"
            className="overflow-auto px-3 py-2 font-mono text-xs text-[color:var(--color-ink)]"
            tone="soft"
          >
            {envFilePath}
          </Panel>
        ) : null}
        <p>{t("auth.installation.db_guide_step_3")}</p>
        <FeedbackBanner tone="info" message={t("auth.installation.db_guide_restart_hint")} />
      </div>
    </AuthScreenLayout>
  );
}
