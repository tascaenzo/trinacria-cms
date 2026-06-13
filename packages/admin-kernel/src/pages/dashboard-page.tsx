import {
  Badge,
  Card,
  Icon,
  InfoCard,
  StatCard,
  type IconName
} from "@trinacria-cms/trinacria-ui";
import { JsonPreviewAction } from "../components/json-preview-action.js";
import { DeclarativeDashboardWidgetPanel } from "../declarative/index.js";
import { useI18n } from "../lib/i18n.js";
import { translateSystemStateLabel, translateToneLabel } from "../lib/ui-translations.js";
import type {
  AdminDashboardWidgetRenderContext,
  AdminPageRenderContext,
  RenderableAdminDashboardWidget
} from "../runtime/admin-route-runtime.js";
import type { AdminResourceDefinition, AdminRouteDefinition } from "../contracts.js";

interface AdminDashboardPageLink {
  id: string;
  pluginId: string;
  title: string;
  summary?: string;
  kind?: AdminRouteDefinition["kind"];
}

export interface DashboardPageProps {
  pluginCount: number;
  capabilityCount: number;
  pages?: readonly AdminDashboardPageLink[];
  resourceCount?: number;
  resources?: readonly AdminResourceDefinition[];
  systemStateLabel: string;
  widgetContext?: Omit<AdminDashboardWidgetRenderContext, "widget">;
  widgets?: readonly RenderableAdminDashboardWidget[];
}

/**
 * DashboardPage follows a denser operational layout with KPI cards, a system
 * summary panel, and a debug snapshot area.
 */
export function DashboardPage({
  capabilityCount,
  pages = [],
  pluginCount,
  resourceCount = 0,
  resources = [],
  systemStateLabel,
  widgetContext,
  widgets = []
}: DashboardPageProps) {
  const { t } = useI18n();
  const translatedSystemState = translateSystemStateLabel(systemStateLabel, t);
  const isHealthy = systemStateLabel === "ok";
  const visibleResourceCount = resources.length;
  const debugPayload = {
    pluginCount,
    capabilityCount,
    resourceCount,
    resources: resources.map((resource) => ({
      id: resource.id,
      entityName: resource.entityName,
      routeId: resource.routeId,
      fields: resource.fields?.map((field) => field.key) ?? []
    })),
    pages: pages.map((page) => ({
      id: page.id,
      pluginId: page.pluginId,
      kind: page.kind
    })),
    systemStateLabel
  };

  return (
    <div className="grid auto-rows-min gap-4">
      <section className="grid gap-4 md:grid-cols-3">
        <WorkspaceTile
          complete={isHealthy}
          icon={isHealthy ? "circle-check-big" : "triangle-alert"}
          title={t("dashboard.setup.runtime_health", "Runtime health")}
          value={translatedSystemState}
          text={t("dashboard.metrics.system_state.description")}
          stateLabel={t(
            isHealthy ? "dashboard.setup.ready" : "dashboard.setup.review",
            isHealthy ? "Ready" : "Review"
          )}
        />
        <WorkspaceTile
          complete={pluginCount > 0}
          icon="plug"
          title={t("dashboard.setup.plugins", "Plugin catalog")}
          value={String(pluginCount)}
          text={t("dashboard.metrics.installed_plugins.description")}
          stateLabel={t(
            pluginCount > 0 ? "dashboard.setup.ready" : "dashboard.setup.review",
            pluginCount > 0 ? "Ready" : "Review"
          )}
        />
        <WorkspaceTile
          complete={visibleResourceCount > 0}
          icon="database"
          title={t("dashboard.setup.resources", "Admin resources")}
          value={String(visibleResourceCount)}
          text={t("dashboard.metrics.resources.description")}
          stateLabel={t(
            visibleResourceCount > 0 ? "dashboard.setup.ready" : "dashboard.setup.review",
            visibleResourceCount > 0 ? "Ready" : "Review"
          )}
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("dashboard.metrics.installed_plugins.label")}
          value={String(pluginCount)}
          description={t("dashboard.metrics.installed_plugins.description")}
          icon="plug"
        />
        <MetricCard
          label={t("dashboard.metrics.capabilities.label")}
          value={String(capabilityCount)}
          description={t("dashboard.metrics.capabilities.description")}
          icon="sparkles"
        />
        <MetricCard
          label={t("dashboard.metrics.system_state.label")}
          value={translatedSystemState}
          description={t("dashboard.metrics.system_state.description")}
          tone={systemStateLabel === "ok" ? "success" : "warning"}
          icon={systemStateLabel === "ok" ? "circle-check-big" : "triangle-alert"}
        />
        <MetricCard
          label={t("dashboard.metrics.resources.label")}
          value={String(resourceCount)}
          description={t("dashboard.metrics.resources.description")}
          icon="database"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card
          eyebrow={t("dashboard.configure.eyebrow", "Configuration")}
          title={t("dashboard.configure.title", "Admin setup")}
          className="min-h-[360px] p-0"
        >
          <div className="divide-y divide-[color:var(--color-border)]">
            <ConfigurationRow
              icon="users"
              title={t("dashboard.configure.operators", "Operators and roles")}
              text={t("dashboard.configure.operators_text", "Create users, roles, and permission grants.")}
            />
            <ConfigurationRow
              icon="key-round"
              title={t("dashboard.configure.api_keys", "API keys")}
              text={t("dashboard.configure.api_keys_text", "Issue service and integration credentials.")}
            />
            <ConfigurationRow
              icon="settings-2"
              title={t("dashboard.configure.settings", "Store settings")}
              text={t("dashboard.configure.settings_text", "Review site, locale, secrets, and runtime definitions.")}
            />
          </div>
        </Card>

        <Card
          eyebrow={t("dashboard.pages.eyebrow", "Workspace")}
          title={t("dashboard.pages.title", "Admin pages")}
          className="min-h-[360px] p-0"
        >
          <div className="divide-y divide-[color:var(--color-border)]">
            {pages.length > 0 ? (
              pages.map((page) => <PageRouteRow key={page.id} page={page} />)
            ) : (
              <p className="p-5 text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {t("dashboard.pages.empty", "No admin pages are visible for the current runtime.")}
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr]">
        <Card
          eyebrow={t("dashboard.resources.eyebrow")}
          title={t("dashboard.resources.title")}
          className="min-h-[360px] p-0"
        >
          <div className="divide-y divide-[color:var(--color-border)]">
            {resources.length > 0 ? (
              resources.map((resource) => <ResourceRow key={resource.id} resource={resource} />)
            ) : (
              <p className="p-5 text-sm leading-6 text-[color:var(--color-ink-muted)]">
                {t("dashboard.resources.empty")}
              </p>
            )}
          </div>
        </Card>
      </div>

      {widgets.length > 0 ? (
        <Card
          eyebrow={t("dashboard.widgets.eyebrow", "Extensions")}
          title={t("dashboard.widgets.title", "Plugin widgets")}
          className="p-0"
        >
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {widgets.map((widget) => (
              <DashboardWidgetSlot
                key={`${widget.pluginId}:${widget.id}`}
                widget={widget}
                context={widgetContext}
              />
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card eyebrow={t("dashboard.activity.eyebrow")} title={t("dashboard.activity.title")}>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
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
          <JsonPreviewAction
            title={t("dashboard.debug.title")}
            description={t("dashboard.debug.eyebrow")}
            payloadTitle={t("dashboard.debug.title")}
            value={debugPayload}
          />
        </Card>
      </div>
    </div>
  );
}

function DashboardWidgetSlot({
  context,
  widget
}: {
  context?: Omit<AdminDashboardWidgetRenderContext, "widget">;
  widget: RenderableAdminDashboardWidget;
}) {
  if (widget.render && context) {
    return <>{widget.render({ ...context, widget })}</>;
  }

  if (widget.mode === "declarative" || widget.kind) {
    return <DeclarativeDashboardWidgetPanel widget={widget} />;
  }

  return (
    <InfoCard
      eyebrow={widget.pluginId}
      title={widget.title}
      description={widget.summary}
      className="bg-[color:var(--color-surface)]"
    />
  );
}

function MetricCard({
  description,
  icon,
  label,
  tone = "neutral",
  value
}: {
  description: string;
  icon?: IconName;
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
      icon={icon}
      badge={!icon ? <Badge tone={tone}>{translateToneLabel(tone, t)}</Badge> : undefined}
    />
  );
}

function ActivityRow({ title, text }: { title: string; text: string }) {
  return <InfoCard title={title} description={text} className="bg-[color:var(--color-surface)]" />;
}

function WorkspaceTile({
  complete,
  icon,
  stateLabel,
  text,
  title,
  value
}: {
  complete: boolean;
  icon: IconName;
  stateLabel: string;
  text: string;
  title: string;
  value: string;
}) {
  return (
    <div className="group relative min-h-[150px] overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-4 shadow-[var(--shadow-sm)] transition hover:border-[color:var(--color-border-strong)]">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[color:var(--color-panel-soft)] to-transparent" />
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)]">
            <Icon name={icon} className="h-[18px] w-[18px]" />
          </span>
          <Badge tone={complete ? "success" : "warning"}>{stateLabel}</Badge>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
            {title}
          </p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
            {value}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

function ConfigurationRow({
  icon,
  text,
  title
}: {
  icon: IconName;
  text: string;
  title: string;
}) {
  return (
    <div className="flex items-start gap-4 p-5">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] text-[color:var(--color-ink-muted)]">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[color:var(--color-ink)]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--color-ink-muted)]">{text}</p>
      </div>
      <Icon name="chevron-right" className="mt-2 text-[color:var(--color-ink-subtle)]" />
    </div>
  );
}

function PageRouteRow({ page }: { page: AdminDashboardPageLink }) {
  const { t } = useI18n();

  return (
    <a
      href={`#${page.id}`}
      className="group flex items-start justify-between gap-4 p-5 transition hover:bg-[color:var(--color-interactive-hover)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[color:var(--color-focus)]"
    >
      <div className="flex min-w-0 items-start gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] text-[color:var(--color-ink-muted)] transition group-hover:border-[color:var(--color-border-strong)] group-hover:text-[color:var(--color-ink)]">
          <Icon name={getRouteIcon(page.kind)} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[color:var(--color-ink)]">{page.title}</p>
            <Badge tone="neutral">{page.pluginId}</Badge>
          </div>
          {page.summary ? (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
              {page.summary}
            </p>
          ) : null}
        </div>
      </div>
      <span className="mt-2 inline-flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)] transition group-hover:text-[color:var(--color-ink)]">
        {t("dashboard.pages.open", "Open")}
        <Icon name="arrow-right" className="h-4 w-4" />
      </span>
    </a>
  );
}

function getRouteIcon(kind: AdminRouteDefinition["kind"] | undefined): IconName {
  switch (kind) {
    case "dashboard":
      return "layout-dashboard";
    case "resource":
      return "database";
    default:
      return "folder-open";
  }
}

function ResourceRow({ resource }: { resource: AdminResourceDefinition }) {
  const { t } = useI18n();
  const tableFieldCount = resource.fields?.filter((field) => field.table).length ?? 0;
  const formFieldCount = resource.fields?.filter((field) => field.form).length ?? 0;

  return (
    <div className="flex items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">{resource.title}</p>
          <Badge>{resource.entityName}</Badge>
        </div>
        {resource.summary ? (
          <p className="mt-1 text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {resource.summary}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <Badge tone="neutral">{tableFieldCount} {t("dashboard.resources.table_fields", "Table fields")}</Badge>
        <Badge tone="neutral">{formFieldCount} {t("dashboard.resources.form_fields", "Form fields")}</Badge>
      </div>
    </div>
  );
}

export function createDashboardRender(props: Omit<DashboardPageProps, "resourceCount">) {
  return (context: AdminPageRenderContext) => (
    <DashboardPage
      {...props}
      pages={context.routes
        .filter((route) => route.id !== "dashboard" && !route.hideShellHeader)
        .map((route) => ({
          id: route.id,
          pluginId: route.pluginId,
          title: route.title,
          summary: route.summary,
          kind: route.kind
        }))}
      resourceCount={context.resources.length}
      resources={context.resources}
      widgetContext={{
        runtimePlugins: context.runtimePlugins,
        capabilityIndex: context.capabilityIndex,
        routes: context.routes,
        resources: context.resources,
        settings: context.settings,
        widgets: context.widgets,
        locale: context.locale,
        t: context.t
      }}
      widgets={context.widgets}
    />
  );
}
