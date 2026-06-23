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
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList
} from "@trinacria-cms/trinacria-ui";
import { useMemo } from "react";
import type { AdminJsonDataBinding, AdminResourceDefinition } from "../../contracts.js";
import type { TranslateFn } from "../../lib/i18n.js";
import type {
  DeclarativeAction,
  DeclarativeActionContext,
  DeclarativeDataController
} from "../types.js";
import { getRecordKey } from "../utils/formatting.js";
import { extractRecordList, getDisplayFields } from "../utils/resource.js";
import {
  formatDeclarativeFieldValue,
  readDeclarativeFieldValue,
  readDeclarativeStatusLabel,
  readDeclarativeStatusTone
} from "./declarative-field-renderers.js";
import { DeclarativeRowActionMenu } from "./declarative-row-actions.js";

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
                    title={readDeclarativeFieldValue(record, primaryField)}
                    subtitle={secondaryField ? readDeclarativeFieldValue(record, secondaryField) : undefined}
                    badges={
                      statusField ? (
                        <Badge tone={readDeclarativeStatusTone(record, statusField)}>
                          {readDeclarativeStatusLabel(record, statusField, t)}
                        </Badge>
                      ) : undefined
                    }
                    actions={
                      recordActions.length || record !== undefined ? (
                        <DeclarativeRowActionMenu
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
                        value={readDeclarativeFieldValue(record, field)}
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
                    const value = formatDeclarativeFieldValue(record, field, t);
                    if (field.key === primaryField?.key) {
                      return (
                        <DataTablePrimaryCell
                          key={field.key}
                          meta={secondaryField ? readDeclarativeFieldValue(record, secondaryField) : field.key}
                        >
                          {readDeclarativeFieldValue(record, field)}
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
                          <DeclarativeRowActionMenu
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
