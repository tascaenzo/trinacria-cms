import { Icon } from "@trinacria-cms/trinacria-ui";
import { useI18n } from "../lib/i18n.js";
export interface InstallationCheckView {
  id: string;
  status: "pass" | "fail" | "blocked";
  message: string;
}
export function InstallationChecks({ checks }: { checks: readonly InstallationCheckView[] }) {
  const { t } = useI18n();
  return (
    <ul
      className="divide-y divide-(--color-border)"
      aria-label={t("auth.installation.checks_title")}
    >
      {checks.map((check) => (
        <li key={check.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <Icon
            name={
              check.status === "pass"
                ? "circle-check-big"
                : check.status === "fail"
                  ? "circle-alert"
                  : "clock-3"
            }
            className={`mt-0.5 h-5 w-5 ${check.status === "pass" ? "text-(--color-success-ink)" : check.status === "fail" ? "text-(--color-danger-ink)" : "text-(--color-ink-muted)"}`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span className="font-medium text-(--color-ink)">
                {t(`auth.installation.check.${check.id}`)}
              </span>
              <span className="text-xs text-(--color-ink-muted)">
                {t(`auth.installation.status.${check.status}`)}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-(--color-ink-muted)">
              {check.status === "blocked"
                ? t("auth.installation.blocked_hint")
                : check.status === "pass"
                  ? t(`auth.installation.message.${check.message}`)
                  : t("auth.installation.failed_hint")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
