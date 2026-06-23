import {
  DropdownMenu,
  DropdownMenuItem,
  IconButton,
  JsonViewDialog
} from "@trinacria-cms/trinacria-ui";
import { useState } from "react";
import type { TranslateFn } from "../../lib/i18n.js";
import type { DeclarativeAction, DeclarativeActionContext } from "../types.js";
import { isDeclarativeActionVisibleForRecord } from "../utils/action-visibility.js";

export function DeclarativeRowActionMenu({
  actions,
  onOpenRecord,
  onPrepareAction,
  record,
  t
}: {
  actions: readonly DeclarativeAction[];
  onOpenRecord?: (record: unknown) => void;
  onPrepareAction?: (action: DeclarativeAction, context?: DeclarativeActionContext) => void;
  record: unknown;
  t: TranslateFn;
}) {
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const canInspectJson = record !== undefined;
  const visibleActions = actions.filter((action) =>
    isDeclarativeActionVisibleForRecord(action, record)
  );

  return (
    <>
      <DropdownMenu
        trigger={
          <IconButton
            icon="more-horizontal"
            label={t("common.actions.row_options", "Row options")}
            variant="secondary"
          />
        }
        contentClassName="min-w-[220px]"
      >
        {canInspectJson && onOpenRecord ? (
          <DropdownMenuItem
            icon="external-link"
            title={t("common.actions.view_detail", "View detail")}
            onClick={() => onOpenRecord(record)}
          />
        ) : null}
        {visibleActions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            icon={getActionIcon(action.intent)}
            title={action.title}
            tone={action.intent === "delete" ? "danger" : "neutral"}
            onClick={() => onPrepareAction?.(action, { record })}
          />
        ))}
        {canInspectJson ? (
          <DropdownMenuItem
            icon="file-json"
            title={t("common.actions.inspect_json", "Inspect JSON")}
            onClick={() => setIsJsonOpen(true)}
          />
        ) : null}
      </DropdownMenu>
      {canInspectJson ? (
        <JsonViewDialog
          open={isJsonOpen}
          onClose={() => setIsJsonOpen(false)}
          closeLabel={t("common.actions.close", "Close")}
          title={t("common.json.row_title", "Row JSON")}
          description={t("common.json.row_description", "Open the raw row payload.")}
          payloadTitle={t("common.json.row_payload", "Row payload")}
          value={record}
          variant="drawer"
          width="lg"
        />
      ) : null}
    </>
  );
}

function getActionIcon(intent: string) {
  if (intent === "update") {
    return "pencil" as const;
  }
  if (intent === "delete") {
    return "trash-2" as const;
  }
  return "more-horizontal" as const;
}
