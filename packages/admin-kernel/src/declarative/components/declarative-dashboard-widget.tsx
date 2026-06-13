import { Card, InfoCard, StatCard } from "@trinacria-cms/trinacria-ui";
import type { RenderableAdminDashboardWidget } from "../../runtime/admin-route-runtime.js";
import { useDeclarativeData } from "../hooks/use-declarative-data.js";
import { formatCellValue, formatEndpoint } from "../utils/formatting.js";
import { readObjectPath } from "../utils/object-path.js";
import { DeclarativeDataBinding } from "./declarative-data-binding.js";

export function DeclarativeDashboardWidgetPanel({
  widget
}: {
  widget: RenderableAdminDashboardWidget;
}) {
  const endpoint = widget.data?.endpoint ? formatEndpoint(widget.data.endpoint) : undefined;
  const dataState = useDeclarativeData(widget.data);
  const value =
    dataState.status === "success"
      ? formatCellValue(readObjectPath(dataState.data, widget.data?.valuePath))
      : widget.data?.valuePath ?? "-";

  if (widget.kind === "metric" || widget.kind === "status") {
    return (
      <StatCard
        label={widget.title}
        value={dataState.status === "loading" ? "..." : value}
        description={dataState.status === "error" ? dataState.error : widget.summary ?? endpoint}
        tone="neutral"
        icon={widget.kind === "status" ? "circle-check-big" : "sparkles"}
      />
    );
  }

  if (widget.kind === "list" || widget.kind === "chart") {
    return (
      <Card eyebrow={widget.pluginId} title={widget.title}>
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {widget.summary ?? "Declarative dashboard widget generated from plugin metadata."}
          </p>
          {widget.data ? <DeclarativeDataBinding binding={widget.data} dataState={dataState} /> : null}
        </div>
      </Card>
    );
  }

  return (
    <InfoCard
      eyebrow={widget.pluginId}
      title={widget.title}
      description={widget.summary ?? endpoint}
      className="bg-[color:var(--color-surface)]"
    />
  );
}
