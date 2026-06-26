import { Badge, Button, Card, KeyValueItem, KeyValuePanel } from "@trinacria-cms/trinacria-ui";
import { JsonPreviewAction } from "../../components/json-preview-action.js";
import type { DeclarativeAction, DeclarativeActionContext } from "../types.js";
import { formatEndpoint } from "../utils/formatting.js";

export function DeclarativeActionsPanel({
  actions,
  onPrepare,
  title
}: {
  actions: readonly DeclarativeAction[];
  onPrepare: (action: DeclarativeAction, context?: DeclarativeActionContext) => void;
  title: string;
}) {
  return (
    <Card eyebrow="Actions" title={title}>
      <div className="grid gap-3">
        {actions.map((action) => (
          <div
            key={action.id}
            className="grid gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                    {action.title}
                  </p>
                  <Badge tone={action.intent === "delete" ? "danger" : "neutral"}>
                    {action.intent}
                  </Badge>
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => onPrepare(action)}>
                Prepare
              </Button>
            </div>
            <KeyValuePanel>
              <KeyValueItem label="Endpoint" value={formatEndpoint(action.endpoint)} />
              {action.input?.valuePath ? (
                <KeyValueItem label="Input path" value={action.input.valuePath} />
              ) : null}
            </KeyValuePanel>
            {action.input?.schema ? (
              <JsonPreviewAction
                title="Input schema"
                payloadTitle="Input schema"
                value={action.input.schema}
              />
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
