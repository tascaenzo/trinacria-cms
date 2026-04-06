import { Badge, Button, Card, JsonView } from "@trinacria-cms/admin-ui";
import { useI18n } from "../lib/i18n.js";
import { translateSystemStateLabel, translateToneLabel } from "../lib/ui-translations.js";

export interface DashboardPageProps {
  pluginCount: number;
  capabilityCount: number;
  systemStateLabel: string;
}

/**
 * DashboardPage follows a denser operational layout with KPI cards, a system
 * summary panel, and a debug snapshot area.
 */
export function DashboardPage({ capabilityCount, pluginCount, systemStateLabel }: DashboardPageProps) {
  const { t } = useI18n();
  const translatedSystemState = translateSystemStateLabel(systemStateLabel, t);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">
            {t("dashboard.title")}
          </h3>
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            {t("dashboard.summary")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">{t("dashboard.actions.export_snapshot")}</Button>
          <Button>{t("dashboard.actions.view_runtime_graph")}</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("dashboard.metrics.installed_plugins.label")}
          value={String(pluginCount)}
          description={t("dashboard.metrics.installed_plugins.description")}
        />
        <MetricCard
          label={t("dashboard.metrics.capabilities.label")}
          value={String(capabilityCount)}
          description={t("dashboard.metrics.capabilities.description")}
        />
        <MetricCard
          label={t("dashboard.metrics.system_state.label")}
          value={translatedSystemState}
          description={t("dashboard.metrics.system_state.description")}
          tone={systemStateLabel === "ok" ? "success" : "warning"}
        />
        <MetricCard
          label={t("dashboard.metrics.admin_model.label")}
          value={t("dashboard.metrics.admin_model.value")}
          description={t("dashboard.metrics.admin_model.description")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card eyebrow={t("dashboard.activity.eyebrow")} title={t("dashboard.activity.title")}>
          <div className="grid gap-3">
            <ActivityRow
              title={t("dashboard.activity.discovery_bootstrap.title")}
              text={t("dashboard.activity.discovery_bootstrap.text")}
            />
            <ActivityRow
              title={t("dashboard.activity.visibility_gating.title")}
              text={t("dashboard.activity.visibility_gating.text")}
            />
            <ActivityRow
              title={t("dashboard.activity.custom_contribution.title")}
              text={t("dashboard.activity.custom_contribution.text")}
            />
          </div>
        </Card>

        <Card eyebrow={t("dashboard.debug.eyebrow")} title={t("dashboard.debug.title")}>
          <JsonView
            value={{
              pluginCount,
              capabilityCount,
              systemStateLabel,
            }}
          />
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  description,
  label,
  tone = "neutral",
  value,
}: {
  description: string;
  label: string;
  tone?: "neutral" | "success" | "warning";
  value: string;
}) {
  const { t } = useI18n();

  return (
    <Card className="p-4" title={undefined} eyebrow={undefined}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[color:var(--color-ink-muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">{value}</p>
        </div>
        <Badge tone={tone}>{translateToneLabel(tone, t)}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--color-ink-subtle)]">{description}</p>
    </Card>
  );
}

function ActivityRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] p-4">
      <p className="text-sm font-medium text-[color:var(--color-ink)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">{text}</p>
    </div>
  );
}

export function createDashboardRender(props: DashboardPageProps) {
  return () => <DashboardPage {...props} />;
}
