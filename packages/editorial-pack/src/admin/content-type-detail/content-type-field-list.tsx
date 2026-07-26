import {
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
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList
} from "@trinacria-cms/trinacria-ui";
import type { ContentTypeField } from "../editorial-admin.types.js";

export function ContentTypeFieldList({
  disabled,
  empty,
  fields,
  onEdit,
  onMove,
  onRemove
}: {
  disabled: boolean;
  empty: string;
  fields: readonly ContentTypeField[];
  onEdit: (field: ContentTypeField) => void;
  onMove: (key: string, direction: "up" | "down") => void;
  onRemove: (key: string) => void;
}) {
  if (!fields.length) {
    return (
      <p className="rounded-lg bg-[color:var(--color-surface-subtle)] p-3 text-sm text-[color:var(--color-ink-muted)]">
        {empty}
      </p>
    );
  }

  const actions = (field: ContentTypeField, index: number) => (
    <FieldActions
      field={field}
      index={index}
      fieldsCount={fields.length}
      disabled={disabled}
      onEdit={onEdit}
      onRemove={onRemove}
      onMove={onMove}
    />
  );

  return (
    <DataTable
      mobile={
        <MobileRecordList>
          {fields.map((field, index) => (
            <MobileRecordCard
              key={field.key}
              title={field.label}
              subtitle={field.key}
              badges={<FieldBadge>{FIELD_TYPE_LABELS[field.type]}</FieldBadge>}
              actions={actions(field, index)}
            >
              <MobileRecordField label="Regole" value={fieldRules(field)} />
            </MobileRecordCard>
          ))}
        </MobileRecordList>
      }
    >
      <DataTableTable>
        <DataTableHead>
          <DataTableHeaderRow>
            <DataTableHeadCell>Campo</DataTableHeadCell>
            <DataTableHeadCell>Tipo</DataTableHeadCell>
            <DataTableHeadCell>Regole</DataTableHeadCell>
            <DataTableHeadCell className="text-right">Azioni</DataTableHeadCell>
          </DataTableHeaderRow>
        </DataTableHead>
        <DataTableBody>
          {fields.map((field, index) => (
            <DataTableRow key={field.key}>
              <DataTablePrimaryCell meta={field.key}>{field.label}</DataTablePrimaryCell>
              <DataTableCell>
                <FieldBadge>{FIELD_TYPE_LABELS[field.type]}</FieldBadge>
              </DataTableCell>
              <DataTableCell className="text-[color:var(--color-ink-muted)]">
                {fieldRules(field)}
              </DataTableCell>
              <DataTableCell>
                <div className="flex justify-end">{actions(field, index)}</div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTableTable>
    </DataTable>
  );
}

function FieldActions({
  disabled,
  field,
  fieldsCount,
  index,
  onEdit,
  onMove,
  onRemove
}: {
  disabled: boolean;
  field: ContentTypeField;
  fieldsCount: number;
  index: number;
  onEdit: (field: ContentTypeField) => void;
  onMove: (key: string, direction: "up" | "down") => void;
  onRemove: (key: string) => void;
}) {
  return (
    <DropdownMenu
      align="end"
      contentClassName="min-w-[210px]"
      trigger={
        <IconButton
          icon="more-horizontal"
          label={`Azioni per ${field.label}`}
          variant="secondary"
          size="sm"
          disabled={disabled}
        />
      }
    >
      <DropdownMenuItem icon="pencil" title="Modifica" onClick={() => onEdit(field)} />
      <DropdownMenuItem
        icon="chevron-up"
        title="Sposta in alto"
        disabled={index === 0}
        onClick={() => onMove(field.key, "up")}
      />
      <DropdownMenuItem
        icon="chevron-down"
        title="Sposta in basso"
        disabled={index === fieldsCount - 1}
        onClick={() => onMove(field.key, "down")}
      />
      <DropdownMenuItem
        icon="trash-2"
        title="Rimuovi"
        tone="danger"
        onClick={() => onRemove(field.key)}
      />
    </DropdownMenu>
  );
}

const FIELD_TYPE_LABELS: Record<ContentTypeField["type"], string> = {
  text: "Testo",
  rich_text: "Testo ricco",
  number: "Numero",
  boolean: "Sì / No",
  date_time: "Data e ora",
  select: "Scelta",
  url: "URL",
  media: "Media",
  relation: "Relazione",
  json: "JSON",
  repeatable: "Ripetibile"
};

function fieldRules(field: ContentTypeField) {
  return `${field.required ? "Obbligatorio" : "Facoltativo"}${
    field.multiple ? " · Più valori" : ""
  }${field.config?.options?.length ? ` · ${field.config.options.length} opzioni` : ""}`;
}

function FieldBadge({ children }: { children: string }) {
  return (
    <span className="rounded bg-[color:var(--color-surface-subtle)] px-1.5 py-0.5 text-xs font-medium text-[color:var(--color-ink-muted)]">
      {children}
    </span>
  );
}
