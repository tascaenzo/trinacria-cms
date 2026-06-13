import {
  Button,
  Card,
  InfoCard,
  ResourceTable,
  ResourceTableCell,
  ResourceTableElement,
  ResourceTableHeadCell,
  ResourceTableHeaderRow,
  ResourceTablePrimaryCell,
  ResourceTableRow
} from "@trinacria-cms/trinacria-ui";
import { useMemo } from "react";
import type { AdminJsonDataBinding, AdminResourceDefinition } from "../../contracts.js";
import type { DeclarativeAction, DeclarativeActionContext, DeclarativeDataController } from "../types.js";
import { formatCellValue, formatFieldPreview, getRecordKey } from "../utils/formatting.js";
import { readObjectPath } from "../utils/object-path.js";
import { extractRecordList, getDisplayFields } from "../utils/resource.js";

export function DeclarativeResourceTable({
  binding,
  dataState,
  onPrepareAction,
  resource
}: {
  binding?: AdminJsonDataBinding;
  dataState?: DeclarativeDataController;
  onPrepareAction?: (action: DeclarativeAction, context?: DeclarativeActionContext) => void;
  resource: AdminResourceDefinition;
}) {
  const tableFields = getDisplayFields(resource, "table");
  const primaryField = tableFields.find((field) => field.primary) ?? tableFields[0];
  const records = useMemo(
    () => extractRecordList(dataState?.data, binding?.valuePath),
    [binding?.valuePath, dataState?.data]
  );
  const hasRealRecords = records.length > 0;

  return (
    <Card
      title={hasRealRecords ? resource.title : `${resource.title} schema`}
      eyebrow={resource.entityName}
      className="p-0"
    >
      {dataState?.status === "loading" ? (
        <InfoCard
          title="Loading resource data"
          description="The declarative renderer is reading the endpoint declared by this resource page."
          className="m-5 bg-[color:var(--color-surface)]"
        />
      ) : null}
      {dataState?.status === "error" ? (
        <InfoCard
          title="Unable to load resource data"
          description={dataState.error}
          tone="dashed"
          className="m-5 bg-[color:var(--color-surface)]"
        />
      ) : null}
      <ResourceTable
        empty={
          <InfoCard
            title="No table fields"
            description="Declare fields with table: true to let the generic renderer build this resource table."
            className="m-5 bg-[color:var(--color-surface)]"
          />
        }
      >
        {tableFields.length > 0 ? (
          <ResourceTableElement>
            <thead>
              <ResourceTableHeaderRow>
                {tableFields.map((field) => (
                  <ResourceTableHeadCell key={field.key}>{field.label}</ResourceTableHeadCell>
                ))}
                {resource.actions?.length ? <ResourceTableHeadCell>Actions</ResourceTableHeadCell> : null}
              </ResourceTableHeaderRow>
            </thead>
            <tbody>
              {(hasRealRecords ? records : [undefined]).map((record, index) => (
                <ResourceTableRow key={getRecordKey(record, index)}>
                  {tableFields.map((field) => {
                    const value = record
                      ? formatCellValue(readObjectPath(record, field.key))
                      : formatFieldPreview(field);
                    if (field.key === primaryField?.key) {
                      return (
                        <ResourceTablePrimaryCell key={field.key} meta={field.key}>
                          {value}
                        </ResourceTablePrimaryCell>
                      );
                    }
                    return <ResourceTableCell key={field.key}>{value}</ResourceTableCell>;
                  })}
                  {resource.actions?.length ? (
                    <ResourceTableCell>
                      <div className="flex flex-wrap gap-2">
                        {resource.actions.map((action) => (
                          <Button
                            key={action.id}
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => onPrepareAction?.(action, { record })}
                          >
                            {action.title}
                          </Button>
                        ))}
                      </div>
                    </ResourceTableCell>
                  ) : null}
                </ResourceTableRow>
              ))}
            </tbody>
          </ResourceTableElement>
        ) : null}
      </ResourceTable>
    </Card>
  );
}
