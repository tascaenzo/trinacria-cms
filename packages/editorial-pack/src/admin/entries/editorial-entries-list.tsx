import {
  formatEditorialDate,
  getEntryStatusMeta,
  type EditorialEntry,
  type EditorialEntryContentType,
  type TransitionAction
} from "./entries.types.js";
import { EditorialEntryActionsMenu } from "./editorial-entry-actions-menu.js";

export function EditorialEntriesList({
  entries,
  contentTypeById,
  locale,
  actionEntryId,
  isLoading,
  onEdit,
  onRevisions,
  onTransition
}: {
  entries: readonly EditorialEntry[];
  contentTypeById: ReadonlyMap<string, EditorialEntryContentType>;
  locale: string;
  actionEntryId: string | null;
  isLoading: boolean;
  onEdit: (entry: EditorialEntry) => void;
  onRevisions: (entry: EditorialEntry) => void;
  onTransition: (entry: EditorialEntry, action: TransitionAction) => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-[var(--shadow-sm)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-[color:var(--color-border)] px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-[color:var(--color-ink-subtle)] sm:grid-cols-[minmax(0,1fr)_150px_130px_150px]">
        <span>Contenuto</span>
        <span className="hidden sm:block">Modello</span>
        <span className="hidden sm:block">Stato</span>
        <span>Azioni</span>
      </div>
      {isLoading ? (
        <EntriesSkeleton />
      ) : entries.length ? (
        <ul>
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              contentType={contentTypeById.get(entry.contentTypeId)}
              locale={locale}
              isActing={actionEntryId === entry.id}
              onRevisions={() => onRevisions(entry)}
              onEdit={() => onEdit(entry)}
              onTransition={onTransition}
            />
          ))}
        </ul>
      ) : (
        <EmptyEntries />
      )}
    </div>
  );
}
function EntryRow({
  entry,
  contentType,
  locale,
  isActing,
  onTransition,
  onRevisions,
  onEdit
}: {
  entry: EditorialEntry;
  contentType?: EditorialEntryContentType;
  locale: string;
  isActing: boolean;
  onTransition: (entry: EditorialEntry, action: TransitionAction) => void;
  onRevisions: () => void;
  onEdit: () => void;
}) {
  const statusMeta = getEntryStatusMeta(entry.status, contentType);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[color:var(--color-border)] px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_150px_130px_150px]">
      <div className="min-w-0">
        <button
          type="button"
          className="max-w-full truncate text-left text-sm font-medium text-[color:var(--color-ink)] hover:underline"
          onClick={onEdit}
        >
          {entry.title ?? "Senza titolo"}
        </button>
        <p className="mt-1 truncate text-xs text-[color:var(--color-ink-subtle)]">
          Aggiornato {formatEditorialDate(entry.updatedAt, locale)}
        </p>
        <span
          className={`mt-2 inline-flex w-fit rounded-full px-2 py-1 text-[11px] font-medium sm:hidden ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>
      <span className="hidden truncate text-sm text-[color:var(--color-ink-muted)] sm:block">
        {contentType?.name ?? "Modello rimosso"}
      </span>
      <span
        className={`hidden w-fit rounded-full px-2 py-1 text-[11px] font-medium sm:block ${statusMeta.className}`}
      >
        {statusMeta.label}
      </span>
      <div className="flex justify-end">
        <EditorialEntryActionsMenu
          entry={entry}
          contentType={contentType}
          isActing={isActing}
          onEdit={onEdit}
          onRevisions={onRevisions}
          onTransition={onTransition}
        />
      </div>
    </li>
  );
}
function EntriesSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-[color:var(--color-border)]">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-[73px] bg-[color:var(--color-panel)]" />
      ))}
    </div>
  );
}
function EmptyEntries() {
  return (
    <div className="grid min-h-64 place-items-center p-6 text-center">
      <div>
        <p className="text-sm font-medium text-[color:var(--color-ink)]">
          Nessun contenuto trovato
        </p>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Crea una bozza o modifica i filtri di ricerca.
        </p>
      </div>
    </div>
  );
}
