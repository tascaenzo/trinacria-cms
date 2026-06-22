import {
  Badge,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableHeaderRow,
  DataTablePrimaryCell,
  DataTableRow,
  DataTableTable,
  DropdownMenu,
  DropdownMenuItem,
  IconButton,
  InfoCard,
  JsonViewDialog,
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList
} from "@trinacria-cms/trinacria-ui";
import { useMemo, useState } from "react";
import type { AdminJsonDataBinding, AdminResourceDefinition } from "../../contracts.js";
import { formatDateTime } from "../../lib/formatting.js";
import { translateStatusLabel } from "../../lib/ui-translations.js";
import type { TranslateFn } from "../../lib/i18n.js";
import type {
  DeclarativeAction,
  DeclarativeActionContext,
  DeclarativeDataController
} from "../types.js";
import { isDeclarativeActionVisibleForRecord } from "../utils/action-visibility.js";
import { formatCellValue, formatFieldPreview, getRecordKey } from "../utils/formatting.js";
import { readObjectPath } from "../utils/object-path.js";
import { extractRecordList, getDisplayFields } from "../utils/resource.js";

const TABLE_TAG_PREVIEW_LIMIT = 3;

export function DeclarativeResourceTable({
  binding,
  dataState,
  onOpenRecord,
  onRefresh,
  onPrepareAction,
  resource,
  t
}: {
  binding?: AdminJsonDataBinding;
  dataState?: DeclarativeDataController;
  onOpenRecord?: (record: unknown) => void;
  onRefresh?: () => void;
  onPrepareAction?: (action: DeclarativeAction, context?: DeclarativeActionContext) => void;
  resource: AdminResourceDefinition;
  t: TranslateFn;
}) {
  const tableFields = getDisplayFields(resource, "table");
  const primaryField = tableFields.find((field) => field.primary) ?? tableFields[0];
  const secondaryField = tableFields.find((field) => field.key !== primaryField?.key);
  const statusField = tableFields.find((field) => field.kind === "status");
  const detailFields = tableFields.filter((field) => field.key !== primaryField?.key);
  const globalActions = resource.actions?.filter((action) => action.intent === "create") ?? [];
  const recordActions = resource.actions?.filter((action) => action.intent !== "create") ?? [];
  const records = useMemo(
    () => extractRecordList(dataState?.data, binding?.valuePath),
    [binding?.valuePath, dataState?.data]
  );
  const hasRealRecords = records.length > 0;
  const hasRecordMenu = recordActions.length > 0 || hasRealRecords;
  const shouldRenderSchemaPreview = !binding?.endpoint && !hasRealRecords;
  const displayRecords = hasRealRecords ? records : shouldRenderSchemaPreview ? [undefined] : [];

  return (
    <DataTable
      mobile={
        tableFields.length > 0 ? (
          <div className="grid gap-3 md:hidden">
            <div className="rounded-[var(--radius-panel)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-surface)]">
              <TableHeaderContent
                globalActions={globalActions}
                onPrepareAction={onPrepareAction}
                onRefresh={onRefresh}
                resource={resource}
                t={t}
              />
            </div>
            <MobileRecordList>
              {displayRecords.length > 0 ? (
                displayRecords.map((record, index) => (
                  <MobileRecordCard
                    key={getRecordKey(record, index)}
                    title={readFieldValue(record, primaryField)}
                    subtitle={secondaryField ? readFieldValue(record, secondaryField) : undefined}
                    badges={
                      statusField ? (
                        <Badge tone={readStatusTone(record, statusField)}>
                          {readStatusLabel(record, statusField, t)}
                        </Badge>
                      ) : undefined
                    }
                    actions={
                      recordActions.length || record !== undefined ? (
                        <RowActionMenu
                          actions={recordActions}
                          onOpenRecord={onOpenRecord}
                          onPrepareAction={onPrepareAction}
                          record={record}
                          t={t}
                        />
                      ) : undefined
                    }
                  >
                    {detailFields.map((field) => (
                      <MobileRecordField
                        key={field.key}
                        label={field.label}
                        value={readFieldValue(record, field)}
                      />
                    ))}
                  </MobileRecordCard>
                ))
              ) : (
                <InfoCard
                  title="No records found"
                  description="This resource endpoint returned an empty collection."
                  tone="dashed"
                />
              )}
            </MobileRecordList>
          </div>
        ) : undefined
      }
      empty={
        <InfoCard
          title="No table fields"
          description="Declare fields with table: true to let the generic renderer build this resource table."
          className="m-5 bg-[color:var(--color-surface)]"
        />
      }
    >
      {tableFields.length > 0 ? (
        <DataTableTable>
          <DataTableHead>
            <DataTableHeaderRow>
              <DataTableHeadCell
                colSpan={tableFields.length + (hasRecordMenu ? 1 : 0)}
                className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4 shadow-[inset_0_-1px_0_var(--color-border)]"
              >
                <TableHeaderContent
                  globalActions={globalActions}
                  onPrepareAction={onPrepareAction}
                  onRefresh={onRefresh}
                  resource={resource}
                  t={t}
                />
              </DataTableHeadCell>
            </DataTableHeaderRow>
            <DataTableHeaderRow>
              {tableFields.map((field) => (
                <DataTableHeadCell key={field.key}>{field.label}</DataTableHeadCell>
              ))}
              {hasRecordMenu ? (
                <DataTableHeadCell>{t("common.table.action", "Action")}</DataTableHeadCell>
              ) : null}
            </DataTableHeaderRow>
          </DataTableHead>
          <DataTableBody>
            {displayRecords.length > 0 ? (
              displayRecords.map((record, index) => (
                <DataTableRow
                  key={getRecordKey(record, index)}
                  role={record !== undefined && onOpenRecord ? "button" : undefined}
                  tabIndex={record !== undefined && onOpenRecord ? 0 : undefined}
                  className={record !== undefined && onOpenRecord ? "cursor-pointer" : undefined}
                  onClick={record !== undefined ? () => onOpenRecord?.(record) : undefined}
                  onKeyDown={(event) => {
                    if (record === undefined || !onOpenRecord) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenRecord(record);
                    }
                  }}
                >
                  {tableFields.map((field) => {
                    const value = formatFieldValue(record, field, t);
                    if (field.key === primaryField?.key) {
                      return (
                        <DataTablePrimaryCell
                          key={field.key}
                          meta={secondaryField ? readFieldValue(record, secondaryField) : field.key}
                        >
                          {readFieldValue(record, field)}
                        </DataTablePrimaryCell>
                      );
                    }
                    return <DataTableCell key={field.key}>{value}</DataTableCell>;
                  })}
                  {hasRecordMenu ? (
                    <DataTableCell>
                      <div
                        className="flex justify-end"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {recordActions.length || record !== undefined ? (
                          <RowActionMenu
                            actions={recordActions}
                            onOpenRecord={onOpenRecord}
                            onPrepareAction={onPrepareAction}
                            record={record}
                            t={t}
                          />
                        ) : null}
                      </div>
                    </DataTableCell>
                  ) : null}
                </DataTableRow>
              ))
            ) : (
              <DataTableRow>
                <DataTableCell
                  colSpan={tableFields.length + (hasRecordMenu ? 1 : 0)}
                  className="text-[color:var(--color-ink-muted)]"
                >
                  No records found.
                </DataTableCell>
              </DataTableRow>
            )}
          </DataTableBody>
        </DataTableTable>
      ) : null}
    </DataTable>
  );
}

function TableHeaderContent({
  globalActions,
  onPrepareAction,
  onRefresh,
  resource,
  t
}: {
  globalActions: readonly DeclarativeAction[];
  onPrepareAction?: (action: DeclarativeAction, context?: DeclarativeActionContext) => void;
  onRefresh?: () => void;
  resource: AdminResourceDefinition;
  t: TranslateFn;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <span className="text-sm font-semibold leading-6 text-[color:var(--color-ink)]">
          {resource.title}
        </span>
        {resource.summary ? (
          <span className="text-xs font-normal leading-5 text-[color:var(--color-ink-muted)]">
            {resource.summary}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <IconButton
          icon="filter"
          label={t("common.actions.filters", "Filters")}
          variant="secondary"
          disabled
        />
        <DropdownMenu
          trigger={
            <Button type="button" variant="secondary">
              {t("common.actions.menu", "Actions")}
            </Button>
          }
        >
          <DropdownMenuItem
            icon="refresh-cw"
            title={t("common.actions.refresh", "Refresh")}
            onClick={onRefresh}
          />
          {globalActions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              icon="plus"
              title={action.title}
              onClick={() => onPrepareAction?.(action)}
            />
          ))}
        </DropdownMenu>
      </div>
    </div>
  );
}

function RowActionMenu({
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

function formatFieldValue(
  record: unknown,
  field: NonNullable<AdminResourceDefinition["fields"]>[number],
  t: TranslateFn
) {
  if (!record) {
    return formatFieldPreview(field);
  }

  const rawValue = readObjectPath(record, field.key);
  if (field.kind === "status") {
    return <Badge tone={readStatusTone(record, field)}>{readStatusLabel(record, field, t)}</Badge>;
  }
  if (field.kind === "datetime") {
    return (
      <span className="text-[color:var(--color-ink-muted)]">
        {typeof rawValue === "string" ? formatDateTime(rawValue) : formatCellValue(rawValue)}
      </span>
    );
  }
  if (field.kind === "tags") {
    return <TagList value={rawValue} limit={TABLE_TAG_PREVIEW_LIMIT} />;
  }
  return formatCellValue(rawValue);
}

function readFieldValue(
  record: unknown,
  field: NonNullable<AdminResourceDefinition["fields"]>[number] | undefined
): string {
  if (!field) {
    return "";
  }
  if (!record) {
    return formatFieldPreview(field);
  }
  const value = readObjectPath(record, field.key);
  if (field.kind === "datetime" && typeof value === "string") {
    return formatDateTime(value);
  }
  if (field.kind === "tags") {
    return formatTagText(value);
  }
  return formatCellValue(value);
}

function readStatusLabel(
  record: unknown,
  field: NonNullable<AdminResourceDefinition["fields"]>[number],
  t: TranslateFn
): string {
  if (!record) {
    return translateStatusLabel("active", t);
  }
  const value = readObjectPath(record, field.key);
  return translateStatusLabel(typeof value === "string" ? value : String(value ?? ""), t);
}

function readStatusTone(
  record: unknown,
  field: NonNullable<AdminResourceDefinition["fields"]>[number]
): "success" | "warning" {
  if (!record) {
    return "success";
  }
  return readObjectPath(record, field.key) === "active" ? "success" : "warning";
}

function TagList({ value, limit }: { value: unknown; limit: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const tags = normalizeTagValues(value);
  if (tags.length === 0) {
    return <span className="text-[color:var(--color-ink-muted)]">-</span>;
  }

  const visibleTags = isExpanded ? tags : tags.slice(0, limit);
  const hiddenCount = tags.length - visibleTags.length;
  const canToggle = tags.length > limit;

  return (
    <div className="flex max-w-[34rem] flex-wrap gap-1.5">
      {visibleTags.map((tag) => (
        <Badge
          key={tag}
          tone="neutral"
          title={tag}
          className="max-w-[18rem] whitespace-normal break-all text-left font-mono leading-4"
        >
          {tag}
        </Badge>
      ))}
      {canToggle ? (
        <button
          type="button"
          aria-label={isExpanded ? "Collapse tags" : "Show all tags"}
          title={isExpanded ? "Collapse tags" : tags.slice(limit).join(", ")}
          className={
            isExpanded
              ? "inline-flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-soft)] text-xs font-semibold text-[color:var(--color-accent-ink)] transition hover:border-[color:var(--color-border-strong)]"
              : "inline-flex items-center rounded-[var(--radius-badge)] border border-[color:var(--color-neutral-border)] bg-[color:var(--color-neutral-bg)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-neutral-ink)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-panel-soft)]"
          }
          onClick={(event) => {
            event.stopPropagation();
            setIsExpanded((current) => !current);
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {isExpanded ? "-" : `+${hiddenCount}`}
        </button>
      ) : null}
    </div>
  );
}

function formatTagText(value: unknown): string {
  const tags = normalizeTagValues(value);
  if (tags.length === 0) {
    return "-";
  }
  return tags.join(", ");
}

function normalizeTagValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return typeof value === "string" && value.trim() ? [value.trim()] : [];
  }
  return value
    .map((item) => {
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
        return String(item).trim();
      }
      return "";
    })
    .filter(Boolean);
}
