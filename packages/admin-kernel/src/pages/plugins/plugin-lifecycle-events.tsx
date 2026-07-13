import { Badge, Card } from "@trinacria-cms/trinacria-ui";
import { EmptyState, ErrorBanner } from "../../components/resource-feedback.js";
import { formatDateTime } from "../../lib/formatting.js";
import type { TranslateFn } from "../../lib/i18n.js";
import type { PluginEvent } from "./plugin-operations.types.js";

interface PluginLifecycleEventsProps {
  readonly error: string | null;
  readonly events: readonly PluginEvent[];
  readonly isLoading: boolean;
  readonly t: TranslateFn;
}

export function PluginLifecycleEvents({ error, events, isLoading, t }: PluginLifecycleEventsProps) {
  return (
    <Card eyebrow={t("plugins.detail.events")} title={t("plugins.detail.title")}>
      {error ? <ErrorBanner message={error} /> : null}
      {isLoading ? <EmptyState text={t("plugins.events.loading")} /> : null}
      {!isLoading && events.length === 0 ? <EmptyState text={t("plugins.events.empty")} /> : null}
      {!isLoading && events.length > 0 ? (
        <ol className="grid gap-3">
          {events.map((event) => (
            <li
              key={`${event.sequence}-${event.timestamp}`}
              className="flex items-start justify-between gap-4 rounded-lg border border-[color:var(--color-border)] p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-[color:var(--color-ink)]">
                  {event.action}
                  {event.phase ? ` · ${event.phase}` : ""}
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                  {formatDateTime(event.timestamp)}
                  {event.durationMs !== undefined ? ` · ${event.durationMs} ms` : ""}
                  {event.stateBefore && event.stateAfter
                    ? ` · ${event.stateBefore} → ${event.stateAfter}`
                    : ""}
                </p>
                {event.message ? (
                  <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                    {event.message}
                  </p>
                ) : null}
              </div>
              <Badge tone={event.success ? "success" : "danger"}>
                {event.success ? t("common.tone.success") : t("plugins.events.failed")}
              </Badge>
            </li>
          ))}
        </ol>
      ) : null}
    </Card>
  );
}
