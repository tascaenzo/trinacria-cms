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
  EmptyState,
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList,
  Panel
} from "@trinacria-cms/trinacria-ui";
import type { ReactNode } from "react";
import { EditorialEntriesHeader } from "./editorial-entries-header.js";
import { EditorialEntryActionsMenu } from "./editorial-entry-actions-menu.js";
import {
  type EditorialEntry,
  type EditorialEntryContentType,
  formatEditorialDate,
  getEntryStatusMeta,
  type TransitionAction
} from "./entries.types.js";

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
    <EditorialEntriesHeader
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
      <Panel className="p-4" elevation="sm">
        {header}
      </Panel>
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
        <EmptyEntries canCreate={canCreate} onCreate={onCreate} />
      )}
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
        <Panel aria-hidden="true" key={item} className="h-32 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyEntries({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <EmptyState
      className="min-h-56 place-items-center text-center"
      title="Nessun contenuto"
      text="Crea la prima bozza per iniziare il lavoro editoriale."
      action={
        canCreate ? (
          <Button type="button" className="mt-4" onClick={onCreate}>
            Nuovo contenuto
          </Button>
        ) : undefined
      }
    />
  );
}
