import { Badge, Button, Card, InfoCard, JsonView, StatCard } from "@trinacria-cms/trinacria-ui";
import { useI18n } from "../lib/i18n.js";
import { translateSystemStateLabel, translateToneLabel } from "../lib/ui-translations.js";
import type { AdminPageRenderContext } from "../runtime/admin-route-runtime.js";
import type { AdminResourceDefinition } from "../contracts.js";

export interface DashboardPageProps {
  pluginCount: number;
  capabilityCount: number;
  resourceCount?: number;
  resources?: readonly AdminResourceDefinition[];
  systemStateLabel: string;
}

/**
 * DashboardPage follows a denser operational layout with KPI cards, a system
 * summary panel, and a debug snapshot area.
 */
export function DashboardPage({
  capabilityCount,
  pluginCount,
  resourceCount = 0,
  resources = [],
  systemStateLabel
}: DashboardPageProps) {
  const { t } = useI18n();
  const translatedSystemState = translateSystemStateLabel(systemStateLabel, t);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">
            {t("dashboard.title")}
          </h3>
          <p className="text-sm text-[color:var(--color-ink-muted)]">{t("dashboard.summary")}</p>
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
          label={t("dashboard.metrics.resources.label")}
          value={String(resourceCount)}
          description={t("dashboard.metrics.resources.description")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
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

        <Card eyebrow={t("dashboard.resources.eyebrow")} title={t("dashboard.resources.title")}>
          <div className="grid gap-3">
            {resources.length > 0 ? (
              resources.map((resource) => <ResourceRow key={resource.id} resource={resource} />)
            ) : (
              <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {t("dashboard.resources.empty")}
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card eyebrow={t("dashboard.debug.eyebrow")} title={t("dashboard.debug.title")}>
          <JsonView
            value={{
              pluginCount,
              capabilityCount,
              resourceCount,
              resources: resources.map((resource) => ({
                id: resource.id,
                entityName: resource.entityName,
                routeId: resource.routeId,
                fields: resource.fields?.map((field) => field.key) ?? []
              })),
              systemStateLabel
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
  value
}: {
  description: string;
  label: string;
  tone?: "neutral" | "success" | "warning";
  value: string;
}) {
  const { t } = useI18n();

  return (
    <StatCard
      label={label}
      value={value}
      description={description}
      tone={tone}
      badge={<Badge tone={tone}>{translateToneLabel(tone, t)}</Badge>}
    />
  );
}

function ActivityRow({ title, text }: { title: string; text: string }) {
  return <InfoCard title={title} description={text} />;
}

function ResourceRow({ resource }: { resource: AdminResourceDefinition }) {
  const { t } = useI18n();
  const tableFieldCount = resource.fields?.filter((field) => field.table).length ?? 0;
  const formFieldCount = resource.fields?.filter((field) => field.form).length ?? 0;

  return (
    <InfoCard title={resource.title} description={resource.summary}>
      <div className="flex flex-wrap gap-2">
        <Badge>{resource.entityName}</Badge>
        <Badge tone="neutral">
          {t("dashboard.resources.table_fields", "Table fields")}: {tableFieldCount}
        </Badge>
        <Badge tone="neutral">
          {t("dashboard.resources.form_fields", "Form fields")}: {formFieldCount}
        </Badge>
      </div>
    </InfoCard>
  );
}

export function createDashboardRender(props: Omit<DashboardPageProps, "resourceCount">) {
  return (context: AdminPageRenderContext) => (
    <DashboardPage
      {...props}
      resourceCount={context.resources.length}
      resources={context.resources}
    />
  );
}
