import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge, Button, Card, Input, JsonView } from "@trinacria-cms/trinacria-ui";
import type {
  ListInstalledPluginsResponse,
  ListPluginEventsResponse,
} from "@trinacria-cms/sdk";
import {
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList,
} from "../components/mobile-records.js";
import { ErrorBanner, EmptyState } from "../components/resource-feedback.js";
import { formatDateTime } from "../lib/formatting.js";
import { useI18n } from "../lib/i18n.js";
import { getSdkErrorDetails, toDisplayError, type SdkErrorDetails } from "../lib/sdk-errors.js";
import { cms } from "../runtime/cms-sdk.js";

type PluginRecord = ListInstalledPluginsResponse["data"][number];
type PluginEventRecord = ListPluginEventsResponse["data"][number];

function getStateTone(
  state: PluginRecord["state"],
): "neutral" | "success" | "warning" {
  if (state === "loaded") return "success";
  if (state === "failed" || state === "disabled") return "warning";
  return "neutral";
}

function getStateLabel(state: PluginRecord["state"]): string {
  switch (state) {
    case "loaded":
      return "loaded";
    case "failed":
      return "failed";
    case "disabled":
      return "disabled";
    case "registered":
      return "registered";
    case "unloaded":
      return "unloaded";
    case "loading":
      return "loading";
    case "initializing":
      return "initializing";
    case "unloading":
      return "unloading";
    default:
      return state;
  }
}

function getOperationLabel(operation: string): string {
  switch (operation) {
    case "load":
      return "Load";
    case "unload":
      return "Unload";
    case "reload":
      return "Reload";
    case "disable":
      return "Disable";
    case "enable":
      return "Enable";
    default:
      return operation;
  }
}

function dependencyIssueCount(plugin: PluginRecord): number {
  return plugin.dependencies.filter((dependency) => dependency.status !== "ok").length;
}

function formatOperationError(details: SdkErrorDetails): string {
  return details.message ?? "Unexpected plugin operation error";
}

export function PluginsPage() {
  const { t } = useI18n();
  const [plugins, setPlugins] = useState<readonly PluginRecord[]>([]);
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<readonly PluginEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationDetails, setOperationDetails] = useState<Record<string, unknown> | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(null);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [disableReason, setDisableReason] = useState("");

  const refresh = useCallback(async (preferredPluginId?: string | null) => {
    setIsLoading(true);
    setPageError(null);
    try {
      const response = await cms.system.listInstalledPlugins();
      setPlugins(response.data);
      setSelectedPluginId((current) => {
        const nextSelectedId = preferredPluginId ?? current;
        if (nextSelectedId && response.data.some((plugin) => plugin.id === nextSelectedId)) {
          return nextSelectedId;
        }
        return response.data[0]?.id ?? null;
      });
    } catch (currentError) {
      setPageError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async (pluginId: string) => {
    setIsEventsLoading(true);
    try {
      const response = await cms.system.listPluginEvents({
        path: {
          pluginId,
        },
      });
      setSelectedEvents(response.data);
    } catch {
      setSelectedEvents([]);
    } finally {
      setIsEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedPluginId) {
      setSelectedEvents([]);
      return;
    }

    void loadEvents(selectedPluginId);
  }, [loadEvents, selectedPluginId]);

  const selectedPlugin = useMemo(
    () => plugins.find((plugin) => plugin.id === selectedPluginId) ?? null,
    [plugins, selectedPluginId],
  );

  const metrics = useMemo(
    () => ({
      loaded: plugins.filter((plugin) => plugin.state === "loaded").length,
      failed: plugins.filter((plugin) => plugin.state === "failed").length,
      disabled: plugins.filter((plugin) => plugin.state === "disabled").length,
      capabilities: plugins.reduce((total, plugin) => total + plugin.capabilities.length, 0),
    }),
    [plugins],
  );

  async function handleOperation(
    operation: PluginRecord["operations"][number]["operation"],
  ) {
    if (!selectedPlugin) {
      return;
    }

    setActiveOperation(operation);
    setOperationError(null);
    setOperationDetails(null);
    setOperationFeedback(null);

    try {
      const response = await cms.system.executePluginOperation({
        path: {
          pluginId: selectedPlugin.id,
        },
        body: {
          operation,
          ...(operation === "disable" && disableReason.trim()
            ? { reason: disableReason.trim() }
            : {}),
        },
      });
      setOperationFeedback(
        t(
          "plugins.feedback.operation_success",
          `${getOperationLabel(response.data.operation)} completed`,
        ),
      );
      await refresh(selectedPlugin.id);
      await loadEvents(selectedPlugin.id);
    } catch (currentError) {
      const details = getSdkErrorDetails(currentError);
      setOperationError(formatOperationError(details));
      setOperationDetails(details.details ?? null);
    } finally {
      setActiveOperation(null);
    }
  }

  return (
    <div className="grid gap-4">
      {pageError ? <ErrorBanner message={pageError} /> : null}
      {operationError ? <ErrorBanner message={operationError} /> : null}
      {operationFeedback ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {operationFeedback}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          eyebrow={t("plugins.metrics.inventory")}
          title={String(plugins.length)}
          description={t("plugins.metrics.inventory_hint")}
        />
        <MetricCard
          eyebrow={t("plugins.metrics.loaded")}
          title={String(metrics.loaded)}
          description={t("plugins.metrics.loaded_hint")}
        />
        <MetricCard
          eyebrow={t("plugins.metrics.failed")}
          title={String(metrics.failed + metrics.disabled)}
          description={t("plugins.metrics.failed_hint")}
        />
        <MetricCard
          eyebrow={t("plugins.metrics.capabilities")}
          title={String(metrics.capabilities)}
          description={t("plugins.metrics.capabilities_hint")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card eyebrow={t("plugins.inventory.eyebrow")} title={t("plugins.inventory.title")}>
          <p className="mb-4 text-sm leading-7 text-[color:var(--color-ink-muted)]">
            {t("plugins.inventory.summary")}
          </p>

          {isLoading ? (
            <EmptyState text={t("plugins.empty.loading")} />
          ) : plugins.length === 0 ? (
            <EmptyState text={t("plugins.empty.none")} />
          ) : (
            <>
              <div className="hidden md:grid">
                <div className="grid grid-cols-[minmax(0,1.5fr)_120px_120px_120px] gap-3 border-b border-[color:var(--color-border)] pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                  <span>{t("plugins.table.plugin")}</span>
                  <span>{t("plugins.table.state")}</span>
                  <span>{t("plugins.table.capabilities")}</span>
                  <span>{t("plugins.table.dependencies")}</span>
                </div>
                <div className="grid">
                  {plugins.map((plugin) => (
                    <button
                      key={plugin.id}
                      type="button"
                      onClick={() => setSelectedPluginId(plugin.id)}
                      className={`grid grid-cols-[minmax(0,1.5fr)_120px_120px_120px] gap-3 border-b border-[color:var(--color-border)] px-1 py-3 text-left transition hover:bg-slate-50 ${
                        plugin.id === selectedPluginId ? "bg-slate-50" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">
                          {plugin.id}
                        </p>
                        <p className="text-sm text-[color:var(--color-ink-muted)]">
                          v{plugin.version}
                        </p>
                      </div>
                      <div>
                        <Badge tone={getStateTone(plugin.state)}>{getStateLabel(plugin.state)}</Badge>
                      </div>
                      <p className="text-sm text-[color:var(--color-ink-muted)]">
                        {plugin.capabilities.length}
                      </p>
                      <p className="text-sm text-[color:var(--color-ink-muted)]">
                        {dependencyIssueCount(plugin) > 0
                          ? `${dependencyIssueCount(plugin)} ${t("plugins.table.issue_suffix")}`
                          : t("plugins.table.dependencies_ok")}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <MobileRecordList>
                {plugins.map((plugin) => (
                  <MobileRecordCard
                    key={plugin.id}
                    title={plugin.id}
                    subtitle={`v${plugin.version}`}
                    badges={<Badge tone={getStateTone(plugin.state)}>{getStateLabel(plugin.state)}</Badge>}
                    actions={
                      <Button variant="ghost" onClick={() => setSelectedPluginId(plugin.id)}>
                        {t("plugins.actions.inspect")}
                      </Button>
                    }
                  >
                    <MobileRecordField
                      label={t("plugins.table.capabilities")}
                      value={String(plugin.capabilities.length)}
                    />
                    <MobileRecordField
                      label={t("plugins.table.dependencies")}
                      value={
                        dependencyIssueCount(plugin) > 0
                          ? `${dependencyIssueCount(plugin)} ${t("plugins.table.issue_suffix")}`
                          : t("plugins.table.dependencies_ok")
                      }
                    />
                  </MobileRecordCard>
                ))}
              </MobileRecordList>
            </>
          )}
        </Card>

        <Card eyebrow={t("plugins.detail.eyebrow")} title={t("plugins.detail.title")}>
          {!selectedPlugin ? (
            <EmptyState text={t("plugins.detail.empty")} />
          ) : (
            <div className="grid gap-5">
              <div className="grid gap-3 rounded-2xl border border-[color:var(--color-border)] bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[color:var(--color-ink)]">
                      {selectedPlugin.id}
                    </p>
                    <p className="text-sm text-[color:var(--color-ink-muted)]">
                      {selectedPlugin.statusReason?.message ?? selectedPlugin.requiresCore}
                    </p>
                  </div>
                  <Badge tone={getStateTone(selectedPlugin.state)}>
                    {getStateLabel(selectedPlugin.state)}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField label={t("plugins.detail.version")} value={`v${selectedPlugin.version}`} />
                  <DetailField
                    label={t("plugins.detail.requires_core")}
                    value={selectedPlugin.requiresCore}
                  />
                  <DetailField
                    label={t("plugins.detail.failure_count")}
                    value={String(selectedPlugin.failureCount)}
                  />
                  <DetailField
                    label={t("plugins.detail.loaded_at")}
                    value={formatDateTime(selectedPlugin.loadedAt)}
                  />
                  <DetailField
                    label={t("plugins.detail.failed_at")}
                    value={formatDateTime(selectedPlugin.failedAt)}
                  />
                  <DetailField
                    label={t("plugins.detail.disabled_reason")}
                    value={selectedPlugin.disabledReason ?? "-"}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Input
                  label={t("plugins.actions.disable_reason")}
                  hint={t("plugins.actions.disable_reason_hint")}
                  value={disableReason}
                  onChange={(event) => setDisableReason(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {selectedPlugin.operations.map((operation) => (
                    <Button
                      key={operation.operation}
                      variant={operation.available ? "primary" : "outline"}
                      disabled={!operation.available || activeOperation !== null}
                      onClick={() => handleOperation(operation.operation)}
                      title={operation.reason}
                    >
                      {activeOperation === operation.operation
                        ? t("plugins.actions.running")
                        : getOperationLabel(operation.operation)}
                    </Button>
                  ))}
                </div>
              </div>

              <SectionBlock title={t("plugins.detail.capabilities")}>
                {selectedPlugin.capabilities.length === 0 ? (
                  <EmptyState text={t("plugins.detail.no_capabilities")} />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedPlugin.capabilities.map((capability) => (
                      <Badge key={capability}>{capability}</Badge>
                    ))}
                  </div>
                )}
              </SectionBlock>

              <SectionBlock title={t("plugins.detail.dependencies")}>
                {selectedPlugin.dependencies.length === 0 ? (
                  <EmptyState text={t("plugins.detail.no_dependencies")} />
                ) : (
                  <div className="grid gap-3">
                    {selectedPlugin.dependencies.map((dependency) => (
                      <div
                        key={`${selectedPlugin.id}:${dependency.pluginId}`}
                        className="rounded-2xl border border-[color:var(--color-border)] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                              {dependency.pluginId}
                            </p>
                            <p className="text-sm text-[color:var(--color-ink-muted)]">
                              {dependency.versionRange}
                            </p>
                          </div>
                          <Badge tone={dependency.status === "ok" ? "success" : "warning"}>
                            {dependency.status}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-[color:var(--color-ink-muted)]">
                          <p>
                            {t("plugins.dependencies.optional")}: {dependency.optional ? "yes" : "no"}
                          </p>
                          <p>
                            {t("plugins.dependencies.current_version")}: {dependency.currentVersion ?? "-"}
                          </p>
                          <p>
                            {t("plugins.dependencies.runtime_state")}: {dependency.state ?? "-"}
                          </p>
                          {dependency.reason ? <p>{dependency.reason}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionBlock>

              <SectionBlock title={t("plugins.detail.events")}>
                {isEventsLoading ? (
                  <EmptyState text={t("plugins.events.loading")} />
                ) : selectedEvents.length === 0 ? (
                  <EmptyState text={t("plugins.events.empty")} />
                ) : (
                  <div className="grid gap-3">
                    {selectedEvents
                      .slice()
                      .reverse()
                      .map((event) => (
                        <div
                          key={`${event.pluginId}:${event.sequence}`}
                          className="rounded-2xl border border-[color:var(--color-border)] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                              #{event.sequence} {event.action}
                            </p>
                            <Badge tone={event.success ? "success" : "warning"}>
                              {event.success ? "ok" : "failed"}
                            </Badge>
                          </div>
                          <div className="mt-2 grid gap-1 text-sm text-[color:var(--color-ink-muted)]">
                            <p>{formatDateTime(event.timestamp)}</p>
                            <p>
                              {event.stateBefore ?? "-"} {"->"} {event.stateAfter ?? "-"}
                            </p>
                            {event.message ? <p>{event.message}</p> : null}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </SectionBlock>

              {selectedPlugin.lastError ? (
                <JsonView title={t("plugins.detail.last_error")} value={selectedPlugin.lastError} />
              ) : null}
              {operationDetails ? (
                <JsonView title={t("plugins.detail.error_context")} value={operationDetails} />
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Card eyebrow={eyebrow} title={title}>
      <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">{description}</p>
    </Card>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
        {label}
      </p>
      <p className="text-sm text-[color:var(--color-ink-muted)]">{value}</p>
    </div>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--color-ink-subtle)]">
        {title}
      </p>
      {children}
    </section>
  );
}
