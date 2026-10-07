import { Button, Disclosure, Panel } from "@trinacria-cms/trinacria-ui";
import { AuthScreenLayout } from "../components/auth-screen-layout.js";
import {
  InstallationChecks,
  type InstallationCheckView
} from "../components/installation-checks.js";
import { useI18n } from "../lib/i18n.js";

export interface InstallationPrerequisitesPageProps {
  envFilePath?: string;
  checks: readonly InstallationCheckView[];
  restartRequired: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function InstallationPrerequisitesPage({
  envFilePath,
  checks,
  restartRequired,
  onRefresh,
  isRefreshing
}: InstallationPrerequisitesPageProps) {
  const { t } = useI18n();
  const actions = [
    ...new Set(checks.filter((check) => check.status === "fail").map((check) => check.message))
  ];
  const needsMongoConfig = actions.includes("configure-mongo");
  const needsRuntimeKeys = actions.includes("configure-runtime-keys");
  const configuration = [
    ...(needsMongoConfig
      ? ["MONGO_URI=mongodb://<user>:<password>@<host>:<port>/<database>?authSource=admin"]
      : []),
    ...(needsRuntimeKeys
      ? [
          "CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID=v1",
          'CMS_SECURE_PAYLOAD_KEYS_JSON={"v1":"<32 random bytes encoded as base64>"}'
        ]
      : [])
  ].join("\n");

  return (
    <AuthScreenLayout
      variant="minimal"
      eyebrow={t("auth.installation.eyebrow")}
      heroTitle={t("auth.installation.prerequisites_title")}
      heroBody={t("auth.installation.prerequisites_summary")}
      formTitle={t("auth.installation.prerequisites_title")}
      formSummary={t("auth.installation.prerequisites_summary")}
    >
      <div className="grid min-w-0 gap-6">
        <InstallationChecks checks={checks} />
        {actions.length > 0 ? (
          <section
            className="min-w-0 border-t border-(--color-border) pt-5"
            aria-labelledby="installation-actions-title"
          >
            <h2
              id="installation-actions-title"
              className="text-sm font-semibold text-(--color-ink)"
            >
              {t("auth.installation.actions_title")}
            </h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-(--color-ink-muted) wrap-anywhere">
              {actions.map((message) => (
                <li key={message}>{t(`auth.installation.message.${message}`)}</li>
              ))}
            </ol>
          </section>
        ) : null}
        {configuration ? (
          <Disclosure className="min-w-0" summary={t("auth.installation.configuration_example")}>
            <p className="mb-3 text-sm leading-6 text-(--color-ink-muted)">
              {t("auth.installation.configuration_hint")}
            </p>
            {envFilePath ? (
              <p className="mb-3 break-all font-mono text-xs text-(--color-ink-muted)">
                {envFilePath}
              </p>
            ) : null}
            <Panel
              as="pre"
              className="min-w-0 overflow-auto p-3 text-xs text-(--color-ink)"
              tone="soft"
            >
              {configuration}
            </Panel>
          </Disclosure>
        ) : null}
        {restartRequired ? (
          <p className="text-sm leading-6 text-(--color-ink-muted)">
            {t("auth.installation.restart_hint")}
          </p>
        ) : null}
        <div className="grid gap-3 border-t border-(--color-border) pt-5">
          <Button type="button" onClick={onRefresh} disabled={isRefreshing}>
            {t(
              isRefreshing
                ? "auth.installation.refreshing_checks"
                : "auth.installation.refresh_checks"
            )}
          </Button>
          <p className="text-center text-xs leading-5 text-(--color-ink-muted)">
            {t("auth.installation.prerequisites_continue_hint")}
          </p>
        </div>
      </div>
    </AuthScreenLayout>
  );
}
