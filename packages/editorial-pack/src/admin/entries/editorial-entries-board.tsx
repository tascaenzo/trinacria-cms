import {
  formatEditorialDate,
  getWorkflowStates,
  type EditorialEntry,
  type EditorialEntryContentType,
  type ContentWorkflowState,
  type TransitionAction
} from "./entries.types.js";
import { EditorialEntryActionsMenu } from "./editorial-entry-actions-menu.js";

export function EditorialEntriesBoard({
  entries,
  contentTypeById,
  locale,
  actionEntryId,
  onEdit,
  onRevisions,
  onTransition
}: {
  entries: readonly EditorialEntry[];
  contentTypeById: ReadonlyMap<string, EditorialEntryContentType>;
  locale: string;
  actionEntryId: string | null;
  onEdit: (entry: EditorialEntry) => void;
  onRevisions: (entry: EditorialEntry) => void;
  onTransition: (entry: EditorialEntry, action: TransitionAction) => void;
}) {
  const states = getWorkflowStates(Array.from(contentTypeById.values()));
  return (
    <div
      className="mt-4 grid gap-4 overflow-x-auto pb-2"
      style={{ gridTemplateColumns: `repeat(${Math.max(states.length, 1)}, minmax(16rem, 1fr))` }}
    >
      {states.map((status) => (
        <BoardColumn
          key={status.key}
          entries={entries.filter((entry) => entry.status === status.key)}
          status={status}
          contentTypeById={contentTypeById}
          locale={locale}
          actionEntryId={actionEntryId}
          onRevisions={onRevisions}
          onEdit={onEdit}
          onTransition={onTransition}
        />
      ))}
    </div>
  );
}
function BoardColumn({
  entries,
  status,
  contentTypeById,
  locale,
  actionEntryId,
  onRevisions,
  onEdit,
  onTransition
}: {
  entries: readonly EditorialEntry[];
  status: ContentWorkflowState;
  contentTypeById: ReadonlyMap<string, EditorialEntryContentType>;
  locale: string;
  actionEntryId: string | null;
  onRevisions: (entry: EditorialEntry) => void;
  onEdit: (entry: EditorialEntry) => void;
  onTransition: (entry: EditorialEntry, action: TransitionAction) => void;
}) {
  return (
    <section className="min-w-64 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] p-3">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[color:var(--color-ink)]">{status.label}</h2>
        <span className="rounded-full bg-[color:var(--color-panel)] px-2 py-0.5 text-xs text-[color:var(--color-ink-subtle)]">
          {entries.length}
        </span>
      </header>
      <div className="grid gap-2">
        {entries.map((entry) => (
          <BoardEntry
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
        {!entries.length ? (
          <p className="rounded-lg border border-dashed border-[color:var(--color-border)] p-3 text-center text-xs text-[color:var(--color-ink-subtle)]">
            Nessun contenuto
          </p>
        ) : null}
      </div>
    </section>
  );
}
function BoardEntry({
  entry,
  contentType,
  locale,
  isActing,
  onRevisions,
  onEdit,
  onTransition
}: {
  entry: EditorialEntry;
  contentType?: EditorialEntryContentType;
  locale: string;
  isActing: boolean;
  onRevisions: () => void;
  onEdit: () => void;
  onTransition: (entry: EditorialEntry, action: TransitionAction) => void;
}) {
  return (
    <article className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-3 shadow-[var(--shadow-sm)]">
      <button
        type="button"
        className="max-w-full truncate text-left text-sm font-medium text-[color:var(--color-ink)] hover:underline"
        onClick={onEdit}
      >
        {entry.title ?? "Senza titolo"}
      </button>
      <p className="mt-1 text-xs text-[color:var(--color-ink-subtle)]">
        {contentType?.name ?? "Modello rimosso"} · {formatEditorialDate(entry.updatedAt, locale)}
      </p>
      <div className="mt-3 flex justify-end">
        <EditorialEntryActionsMenu
          entry={entry}
          contentType={contentType}
          isActing={isActing}
          onEdit={onEdit}
          onRevisions={onRevisions}
          onTransition={onTransition}
        />
      </div>
    </article>
  );
}
