import { Badge, Button, Card, FeedbackBanner } from "@trinacria-cms/trinacria-ui";
import { EmptyState, ErrorBanner } from "../../components/resource-feedback.js";
import { formatDateTime } from "../../lib/formatting.js";
import type { TranslateFn } from "../../lib/i18n.js";
import type {
  PluginOperation,
  PluginOperationAvailability,
  PluginSnapshot
} from "./plugin-operations.types.js";
import { dependencyTone } from "./plugin-operations-utils.js";

interface PluginDetailProps {
  readonly isRunningOperation: PluginOperation | null;
  readonly plugin: PluginSnapshot | null;
  readonly t: TranslateFn;
  readonly onDisable: () => void;
  readonly onOperation: (operation: PluginOperation) => void;
}

export function PluginDetail({
  isRunningOperation,
  plugin,
  t,
  onDisable,
  onOperation
}: PluginDetailProps) {
  if (!plugin) {
    return <EmptyState text={t("plugins.detail.empty")} />;
  }

  return (
    <Card eyebrow={t("plugins.detail.eyebrow")} title={plugin.id}>
      <div className="grid gap-5 text-sm">
        <dl className="grid gap-3 sm:grid-cols-3">
          <DetailItem label={t("plugins.detail.version")} value={plugin.version} />
          <DetailItem label={t("plugins.detail.requires_core")} value={plugin.requiresCore} />
          <DetailItem
            label={t("plugins.detail.source")}
            value={plugin.source ? `${plugin.source.type} · ${plugin.source.name}` : undefined}
          />
          <DetailItem label={t("plugins.table.state")} value={plugin.state} />
          <DetailItem
            label={t("plugins.detail.loaded_at")}
            value={formatDateTime(plugin.loadedAt)}
          />
          <DetailItem
            label={t("plugins.detail.failure_count")}
            value={String(plugin.failureCount)}
          />
        </dl>

        {plugin.statusReason ? (
          <FeedbackBanner
            tone="warning"
            title={plugin.statusReason.code}
            message={plugin.statusReason.message}
          />
        ) : null}
        {plugin.lastError ? (
          <ErrorBanner
            message={`${plugin.lastError.code ? `${plugin.lastError.code} · ` : ""}${plugin.lastError.message}`}
          />
        ) : null}

        <DetailSection title={t("plugins.detail.capabilities")}>
          {plugin.capabilities.length === 0 ? (
            <p className="text-[color:var(--color-ink-muted)]">
              {t("plugins.detail.no_capabilities")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {plugin.capabilities.map((capability) => (
                <Badge key={capability}>{capability}</Badge>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title={t("plugins.detail.dependencies")}>
          {plugin.dependencies.length === 0 ? (
            <p className="text-[color:var(--color-ink-muted)]">
              {t("plugins.detail.no_dependencies")}
            </p>
          ) : (
            <ul className="grid gap-2">
              {plugin.dependencies.map((dependency) => (
                <li
                  key={dependency.pluginId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--color-border)] p-3"
                >
                  <div>
                    <p className="font-medium text-[color:var(--color-ink)]">
                      {dependency.pluginId}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                      {dependency.versionRange}
                      {dependency.currentVersion
                        ? ` · ${t("plugins.dependencies.current_version")}: ${dependency.currentVersion}`
                        : ""}
                      {dependency.optional ? ` · ${t("plugins.dependencies.optional")}` : ""}
                    </p>
                    {dependency.reason ? (
                      <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                        {dependency.reason}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={dependencyTone(dependency.status)}>{dependency.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <div className="grid gap-2 border-t border-[color:var(--color-border)] pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-ink-muted)]">
            {t("common.actions.menu")}
          </p>
          <div className="flex flex-wrap gap-2">
            {plugin.operations.map((entry) => (
              <OperationButton
                key={entry.operation}
                entry={entry}
                isRunning={isRunningOperation === entry.operation}
                isAnyOperationRunning={isRunningOperation !== null}
                t={t}
                onDisable={onDisable}
                onOperation={onOperation}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function OperationButton({
  entry,
  isRunning,
  isAnyOperationRunning,
  t,
  onDisable,
  onOperation
}: {
  readonly entry: PluginOperationAvailability;
  readonly isRunning: boolean;
  readonly isAnyOperationRunning: boolean;
  readonly t: TranslateFn;
  readonly onDisable: () => void;
  readonly onOperation: (operation: PluginOperation) => void;
}) {
  const label = t(`plugins.operations.${entry.operation}`, entry.operation);
  return (
    <Button
      type="button"
      variant={entry.operation === "disable" ? "secondary" : undefined}
      title={entry.available ? undefined : entry.reason}
      disabled={!entry.available || isAnyOperationRunning}
      onClick={() => (entry.operation === "disable" ? onDisable() : onOperation(entry.operation))}
    >
      {isRunning ? t("plugins.actions.running") : label}
    </Button>
  );
}

function DetailSection({
  title,
  children
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-[color:var(--color-border)] pt-4">
      <h3 className="font-medium text-[color:var(--color-ink)]">{title}</h3>
      {children}
    </section>
  );
}

function DetailItem({ label, value }: { readonly label: string; readonly value?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[color:var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-[color:var(--color-ink)]">{value || "—"}</dd>
    </div>
  );
}
