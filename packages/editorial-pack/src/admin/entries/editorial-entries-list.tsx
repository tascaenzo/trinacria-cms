import {
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
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList
} from "@trinacria-cms/trinacria-ui";
import type { ReactNode } from "react";
import {
  formatEditorialDate,
  getEntryStatusMeta,
  type EditorialEntry,
  type EditorialEntryContentType,
  type TransitionAction
} from "./entries.types.js";
import { EditorialEntryActionsMenu } from "./editorial-entry-actions-menu.js";

interface EditorialEntriesListProps {
  actionEntryId: string | null;
  canCreate: boolean;
  contentTypeById: ReadonlyMap<string, EditorialEntryContentType>;
  description: string;
  entries: readonly EditorialEntry[];
  isLoading: boolean;
  locale: string;
  onCreate: () => void;
  onEdit: (entry: EditorialEntry) => void;
  onRefresh: () => void;
  onRevisions: (entry: EditorialEntry) => void;
  onTransition: (entry: EditorialEntry, action: TransitionAction) => void;
  title: string;
}

export function EditorialEntriesList(props: EditorialEntriesListProps) {
  const header = (
    <EntriesTableHeader
      title={props.title}
      description={props.description}
      canCreate={props.canCreate}
      isLoading={props.isLoading}
      onCreate={props.onCreate}
      onRefresh={props.onRefresh}
    />
  );

  return (
    <DataTable mobile={<MobileEntriesList {...props} header={header} />}>
      <DataTableTable>
        <DataTableHead>
          <DataTableHeaderRow>
            <DataTableHeadCell
              colSpan={5}
              className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4 shadow-[inset_0_-1px_0_var(--color-border)]"
            >
              {header}
            </DataTableHeadCell>
          </DataTableHeaderRow>
          <DataTableHeaderRow>
            <DataTableHeadCell>Contenuto</DataTableHeadCell>
            <DataTableHeadCell>Modello</DataTableHeadCell>
            <DataTableHeadCell>Stato</DataTableHeadCell>
            <DataTableHeadCell>Aggiornato</DataTableHeadCell>
            <DataTableHeadCell className="text-right">Azioni</DataTableHeadCell>
          </DataTableHeaderRow>
        </DataTableHead>
        <DataTableBody>
          {props.isLoading ? (
            <EntriesSkeleton />
          ) : props.entries.length ? (
            props.entries.map((entry) => <EntryRow key={entry.id} entry={entry} {...props} />)
          ) : (
            <DataTableRow>
              <DataTableCell colSpan={5} className="p-0">
                <EmptyEntries canCreate={props.canCreate} onCreate={props.onCreate} />
              </DataTableCell>
            </DataTableRow>
          )}
        </DataTableBody>
      </DataTableTable>
    </DataTable>
  );
}

function EntryRow({
  actionEntryId,
  contentTypeById,
  entry,
  locale,
  onEdit,
  onRevisions,
  onTransition
}: EditorialEntriesListProps & { entry: EditorialEntry }) {
  const contentType = contentTypeById.get(entry.contentTypeId);
  const status = getEntryStatusMeta(entry.status, contentType);

  return (
    <DataTableRow
      role="button"
      tabIndex={0}
      className="cursor-pointer"
      onClick={() => onEdit(entry)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(entry);
        }
      }}
    >
      <DataTablePrimaryCell meta={entry.slug ?? "Senza slug"}>
        {entry.title ?? "Senza titolo"}
      </DataTablePrimaryCell>
      <DataTableCell className="text-[color:var(--color-ink-muted)]">
        {contentType?.name ?? "Modello rimosso"}
      </DataTableCell>
      <DataTableCell>
        <EntryStatus label={status.label} className={status.className} />
      </DataTableCell>
      <DataTableCell className="text-[color:var(--color-ink-muted)]">
        {formatEditorialDate(entry.updatedAt, locale)}
      </DataTableCell>
      <DataTableCell>
        <div
          className="flex justify-end"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <EditorialEntryActionsMenu
            entry={entry}
            contentType={contentType}
            isActing={actionEntryId === entry.id}
            onEdit={() => onEdit(entry)}
            onRevisions={() => onRevisions(entry)}
            onTransition={onTransition}
          />
        </div>
      </DataTableCell>
    </DataTableRow>
  );
}

function MobileEntriesList({
  actionEntryId,
  canCreate,
  contentTypeById,
  entries,
  header,
  isLoading,
  locale,
  onCreate,
  onEdit,
  onRevisions,
  onTransition
}: EditorialEntriesListProps & { header: ReactNode }) {
  return (
    <div className="grid gap-3 md:hidden">
      <div className="rounded-[var(--radius-panel)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-surface)]">
        {header}
      </div>
      {isLoading ? (
        <MobileEntriesSkeleton />
      ) : entries.length ? (
        <MobileRecordList>
          {entries.map((entry) => {
            const contentType = contentTypeById.get(entry.contentTypeId);
            const status = getEntryStatusMeta(entry.status, contentType);
            return (
              <MobileRecordCard
                key={entry.id}
                title={entry.title ?? "Senza titolo"}
                subtitle={entry.slug ?? "Senza slug"}
                badges={<EntryStatus label={status.label} className={status.className} />}
                actions={
                  <EditorialEntryActionsMenu
                    entry={entry}
                    contentType={contentType}
                    isActing={actionEntryId === entry.id}
                    onEdit={() => onEdit(entry)}
                    onRevisions={() => onRevisions(entry)}
                    onTransition={onTransition}
                  />
                }
              >
                <MobileRecordField label="Modello" value={contentType?.name ?? "Modello rimosso"} />
                <MobileRecordField
                  label="Aggiornato"
                  value={formatEditorialDate(entry.updatedAt, locale)}
                />
              </MobileRecordCard>
            );
          })}
        </MobileRecordList>
      ) : (
        <div className="rounded-[var(--radius-panel)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-surface)]">
          <EmptyEntries canCreate={canCreate} onCreate={onCreate} />
        </div>
      )}
    </div>
  );
}

function EntriesTableHeader({
  canCreate,
  description,
  isLoading,
  onCreate,
  onRefresh,
  title
}: Pick<
  EditorialEntriesListProps,
  "canCreate" | "description" | "isLoading" | "onCreate" | "onRefresh" | "title"
>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <span className="text-sm font-semibold leading-6 text-[color:var(--color-ink)]">
          {title}
        </span>
        <span className="text-xs font-normal leading-5 text-[color:var(--color-ink-muted)]">
          {description}
        </span>
      </div>
      <DropdownMenu
        align="end"
        trigger={
          <Button type="button" variant="secondary" size="sm">
            Azioni
          </Button>
        }
      >
        <DropdownMenuItem
          icon="refresh-cw"
          title="Aggiorna"
          disabled={isLoading}
          onClick={onRefresh}
        />
        <DropdownMenuItem
          icon="plus"
          title="Nuovo contenuto"
          disabled={!canCreate}
          onClick={onCreate}
        />
      </DropdownMenu>
    </div>
  );
}

function EntryStatus({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full px-2 py-1 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function EntriesSkeleton() {
  return [0, 1, 2, 3].map((item) => (
    <DataTableRow key={item}>
      <DataTableCell colSpan={5} className="p-0">
        <div className="h-[73px] animate-pulse bg-[color:var(--color-panel)]" />
      </DataTableCell>
    </DataTableRow>
  ));
}

function MobileEntriesSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-32 animate-pulse rounded-[var(--radius-panel)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
        />
      ))}
    </div>
  );
}

function EmptyEntries({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="grid min-h-56 place-items-center p-6 text-center">
      <div>
        <h2 className="font-semibold text-[color:var(--color-ink)]">Nessun contenuto</h2>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Crea la prima bozza per iniziare il lavoro editoriale.
        </p>
        {canCreate ? (
          <Button type="button" className="mt-4" onClick={onCreate}>
            Nuovo contenuto
          </Button>
        ) : null}
      </div>
    </div>
  );
}
