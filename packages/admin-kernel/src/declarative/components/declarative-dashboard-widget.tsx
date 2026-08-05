import { Card, CardContent, CardHeader, CardHeading, StatCard } from "@trinacria-cms/trinacria-ui";
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
      : (widget.data?.valuePath ?? "-");

  if (widget.kind === "metric" || widget.kind === "status") {
    return (
      <StatCard
        label={widget.title}
        value={dataState.status === "loading" ? "..." : value}
        description={dataState.status === "error" ? dataState.error : (widget.summary ?? endpoint)}
        tone="neutral"
        icon={widget.kind === "status" ? "circle-check-big" : "sparkles"}
      />
    );
  }

  if (widget.kind === "list" || widget.kind === "chart") {
    return (
      <Card className="h-full" padding="none" elevation="none">
        <CardHeader>
          <CardHeading
            icon={widget.kind === "list" ? "list" : "layout-dashboard"}
            title={widget.title}
            description={widget.summary ?? "Widget generato dai metadati del plugin dichiarativo."}
          />
        </CardHeader>
        <CardContent>
          {widget.data ? (
            <DeclarativeDataBinding binding={widget.data} dataState={dataState} />
          ) : (
            <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
              Nessuna sorgente dati configurata.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full" padding="none" elevation="none">
      <CardHeader>
        <CardHeading icon="puzzle" title={widget.title} description={widget.summary} />
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
          {endpoint ?? "Nessun dettaglio aggiuntivo disponibile."}
        </p>
      </CardContent>
    </Card>
  );
}
