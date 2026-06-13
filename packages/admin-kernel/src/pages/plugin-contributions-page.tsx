import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, InfoCard, StatCard } from "@trinacria-cms/trinacria-ui";
import type { ListPluginContributionsResponse } from "@trinacria-cms/sdk";
import { JsonPreviewAction } from "../components/json-preview-action.js";
import { EmptyState, ErrorBanner } from "../components/resource-feedback.js";
import { useI18n } from "../lib/i18n.js";
import { toDisplayError } from "../lib/sdk-errors.js";
import { cms } from "../runtime/cms-sdk.js";

type ContributionCatalog = ListPluginContributionsResponse["data"];
type ContributionRecord = ContributionCatalog["entities"][number];
type ContributionGroupId =
  | "entities"
  | "settings"
  | "events.emits"
  | "events.subscribes"
  | "admin.navigation"
  | "admin.routes"
  | "admin.resources"
  | "admin.widgets"
  | "admin.settingsSections";

interface ContributionGroup {
  id: ContributionGroupId;
  title: string;
  description: string;
  records: readonly ContributionRecord[];
}

export function PluginContributionsPage() {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<ContributionCatalog | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<ContributionGroupId>("entities");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    try {
      const response = await cms.system.listPluginContributions();
      setCatalog(response.data);
    } catch (currentError) {
      setPageError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groups = useMemo<readonly ContributionGroup[]>(() => {
    const emptyCatalog: ContributionCatalog = {
      entities: [],
      settings: [],
      events: {
        emits: [],
        subscribes: []
      },
      admin: {
        navigation: [],
        routes: [],
        resources: [],
        widgets: [],
        settingsSections: []
      }
    };
    const current = catalog ?? emptyCatalog;

    return [
      {
        id: "entities",
        title: t("plugin_contributions.groups.entities.title"),
        description: t("plugin_contributions.groups.entities.description"),
        records: current.entities
      },
      {
        id: "settings",
        title: t("plugin_contributions.groups.settings.title"),
        description: t("plugin_contributions.groups.settings.description"),
        records: current.settings
      },
      {
        id: "events.emits",
        title: t("plugin_contributions.groups.events_emits.title"),
        description: t("plugin_contributions.groups.events_emits.description"),
        records: current.events.emits
      },
      {
        id: "events.subscribes",
        title: t("plugin_contributions.groups.events_subscribes.title"),
        description: t("plugin_contributions.groups.events_subscribes.description"),
        records: current.events.subscribes
      },
      {
        id: "admin.navigation",
        title: t("plugin_contributions.groups.admin_navigation.title"),
        description: t("plugin_contributions.groups.admin_navigation.description"),
        records: current.admin.navigation
      },
      {
        id: "admin.routes",
        title: t("plugin_contributions.groups.admin_routes.title"),
        description: t("plugin_contributions.groups.admin_routes.description"),
        records: current.admin.routes
      },
      {
        id: "admin.resources",
        title: t("plugin_contributions.groups.admin_resources.title"),
        description: t("plugin_contributions.groups.admin_resources.description"),
        records: current.admin.resources
      },
      {
        id: "admin.widgets",
        title: t("plugin_contributions.groups.admin_widgets.title"),
        description: t("plugin_contributions.groups.admin_widgets.description"),
        records: current.admin.widgets
      },
      {
        id: "admin.settingsSections",
        title: t("plugin_contributions.groups.admin_settings_sections.title"),
        description: t("plugin_contributions.groups.admin_settings_sections.description"),
        records: current.admin.settingsSections
      }
    ];
  }, [catalog, t]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];
  const selectedRecord =
    selectedGroup?.records.find((record) => record.key === selectedKey) ??
    selectedGroup?.records[0] ??
    null;
  const metrics = useMemo(
    () => ({
      entities: catalog?.entities.length ?? 0,
      settings: catalog?.settings.length ?? 0,
      events: (catalog?.events.emits.length ?? 0) + (catalog?.events.subscribes.length ?? 0),
      admin:
        (catalog?.admin.navigation.length ?? 0) +
        (catalog?.admin.routes.length ?? 0) +
        (catalog?.admin.resources.length ?? 0) +
        (catalog?.admin.widgets.length ?? 0) +
        (catalog?.admin.settingsSections.length ?? 0)
    }),
    [catalog]
  );

  return (
    <div className="grid gap-4">
      {pageError ? <ErrorBanner message={pageError} /> : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-[color:var(--color-ink)]">
            {t("plugin_contributions.title")}
          </h3>
          <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {t("plugin_contributions.summary")}
          </p>
        </div>
        <Button variant="secondary" onClick={() => void refresh()} disabled={isLoading}>
          {isLoading ? t("common.actions.working") : t("common.actions.refresh")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("plugin_contributions.metrics.entities")} value={metrics.entities} />
        <MetricCard label={t("plugin_contributions.metrics.settings")} value={metrics.settings} />
        <MetricCard label={t("plugin_contributions.metrics.events")} value={metrics.events} />
        <MetricCard label={t("plugin_contributions.metrics.admin")} value={metrics.admin} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card
          eyebrow={t("plugin_contributions.groups.eyebrow")}
          title={t("plugin_contributions.groups.title")}
        >
          <div className="grid gap-3">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setSelectedGroupId(group.id);
                  setSelectedKey(null);
                }}
                className={`rounded-sm border px-3 py-3 text-left transition ${
                  selectedGroup?.id === group.id
                    ? "border-[color:var(--color-action-primary-bg)] bg-[color:var(--color-interactive-selected)]"
                    : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-interactive-hover)]"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[color:var(--color-ink)]">
                    {group.title}
                  </span>
                  <Badge tone={group.records.length > 0 ? "success" : "neutral"}>
                    {group.records.length}
                  </Badge>
                </span>
                <span className="mt-1 block text-xs leading-5 text-[color:var(--color-ink-muted)]">
                  {group.description}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card
          eyebrow={selectedGroup?.title ?? t("plugin_contributions.detail.eyebrow")}
          title={t("plugin_contributions.detail.title")}
        >
          {isLoading ? (
            <EmptyState text={t("plugin_contributions.empty.loading")} />
          ) : !selectedGroup || selectedGroup.records.length === 0 ? (
            <EmptyState text={t("plugin_contributions.empty.none")} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="grid content-start gap-2">
                {selectedGroup.records.map((record) => (
                  <button
                    key={record.key}
                    type="button"
                    onClick={() => setSelectedKey(record.key)}
                    className={`rounded-sm border px-3 py-3 text-left transition ${
                      selectedRecord?.key === record.key
                        ? "border-[color:var(--color-action-primary-bg)] bg-[color:var(--color-interactive-selected)]"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-interactive-hover)]"
                    }`}
                  >
                    <span className="block truncate text-sm font-semibold text-[color:var(--color-ink)]">
                      {record.key}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[color:var(--color-ink-muted)]">
                      {record.pluginId}
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid content-start gap-3">
                {selectedRecord ? (
                  <>
                    <InfoCard
                      title={selectedRecord.key}
                      description={`${t("common.table.owner")}: ${selectedRecord.pluginId}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{selectedGroup.title}</Badge>
                        <Badge tone="neutral">{selectedRecord.pluginId}</Badge>
                        <JsonPreviewAction
                          title={selectedRecord.key}
                          description={`${t("common.table.owner")}: ${selectedRecord.pluginId}`}
                          payloadTitle={selectedGroup.title}
                          value={selectedRecord.declaration}
                        />
                      </div>
                    </InfoCard>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card
        eyebrow={t("plugin_contributions.raw.eyebrow")}
        title={t("plugin_contributions.raw.title")}
      >
        <JsonPreviewAction
          title={t("plugin_contributions.raw.title")}
          description={t("plugin_contributions.raw.eyebrow")}
          payloadTitle={t("plugin_contributions.raw.title")}
          value={catalog ?? {}}
          width="xl"
        />
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <StatCard
      label={label}
      value={String(value)}
      description=""
      badge={<Badge tone={value > 0 ? "success" : "neutral"}>{String(value)}</Badge>}
    />
  );
}
