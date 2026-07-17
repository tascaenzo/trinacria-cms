import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Input, Select } from "@trinacria-cms/trinacria-ui";
import { EditorialEntriesBoard } from "./entries/editorial-entries-board.js";
import {
  CreateEditorialEntryDialog,
  EntryRevisionsDialog,
  SaveEditorialViewDialog
} from "./entries/editorial-entries-dialogs.js";
import { EditorialEntriesList } from "./entries/editorial-entries-list.js";
import {
  readSavedEditorialViews,
  writeSavedEditorialViews
} from "./entries/saved-editorial-views.js";
import { useEditorialEntries } from "./entries/use-editorial-entries.js";
import {
  getWorkflowStates,
  type EditorialEntry,
  type EntryRevision,
  type SavedEditorialView
} from "./entries/entries.types.js";
import type { CmsClient } from "./editorial-admin.types.js";

export interface EditorialEntriesPageContext {
  cms: CmsClient;
  locale?: string;
}
type ViewMode = "list" | "board";
const NAVIGATION_EVENT = "trinacria-cms:backoffice-navigation";

/** Composes the content desk; requests and reusable views live in entries/. */
export function EditorialEntriesPage({ cms, locale = "it-IT" }: EditorialEntriesPageContext) {
  const desk = useEditorialEntries(cms);
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [typeFilter, setTypeFilter] = useState(readContentTypeFilter);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [savedViews, setSavedViews] = useState<readonly SavedEditorialView[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaveViewOpen, setIsSaveViewOpen] = useState(false);
  const [revisionEntry, setRevisionEntry] = useState<EditorialEntry | null>(null);
  const [revisions, setRevisions] = useState<readonly EntryRevision[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);

  useEffect(() => setSavedViews(readSavedEditorialViews()), []);
  useEffect(() => {
    const syncContentTypeFilter = () => setTypeFilter(readContentTypeFilter());
    window.addEventListener(NAVIGATION_EVENT, syncContentTypeFilter);
    window.addEventListener("popstate", syncContentTypeFilter);
    return () => {
      window.removeEventListener(NAVIGATION_EVENT, syncContentTypeFilter);
      window.removeEventListener("popstate", syncContentTypeFilter);
    };
  }, []);
  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return desk.entries.filter(
      (entry) =>
        (statusFilter === "all" || entry.status === statusFilter) &&
        (typeFilter === "all" || entry.contentTypeId === typeFilter) &&
        (!normalizedSearch || (entry.title ?? "").toLocaleLowerCase().includes(normalizedSearch))
    );
  }, [desk.entries, search, statusFilter, typeFilter]);
  const workflowStates = useMemo(
    () => getWorkflowStates(desk.activeContentTypes),
    [desk.activeContentTypes]
  );
  const selectedContentType = desk.contentTypeById.get(typeFilter);

  const openRevisions = async (entry: EditorialEntry) => {
    setRevisionEntry(entry);
    setRevisions([]);
    setIsLoadingRevisions(true);
    setRevisions(await desk.loadRevisions(entry));
    setIsLoadingRevisions(false);
  };
  const applyView = (view: SavedEditorialView) => {
    setStatusFilter(view.status);
    setTypeFilter(view.contentTypeId);
    setSearch(view.search);
    setViewMode(view.mode);
  };
  const saveView = (name: string) => {
    const view: SavedEditorialView = {
      id: crypto.randomUUID(),
      name,
      status: statusFilter,
      contentTypeId: typeFilter,
      search,
      mode: viewMode
    };
    const updated = [...savedViews, view];
    setSavedViews(updated);
    writeSavedEditorialViews(updated);
  };
  const removeView = (id: string) => {
    const updated = savedViews.filter((view) => view.id !== id);
    setSavedViews(updated);
    writeSavedEditorialViews(updated);
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--color-ink)]">
            {selectedContentType?.name ?? "Contenuti"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[color:var(--color-ink-muted)]">
            {selectedContentType
              ? `Gestisci i contenuti di tipo ${selectedContentType.name}.`
              : "Crea, organizza e porta i contenuti dalla bozza alla pubblicazione."}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={desk.isLoading}
            onClick={() => void desk.refresh()}
          >
            <Icon name="refresh-cw" className={desk.isLoading ? "animate-spin" : undefined} />
            Aggiorna
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!desk.activeContentTypes.length}
            onClick={() => setIsCreateOpen(true)}
          >
            <Icon name="plus" />
            Nuovo contenuto
          </Button>
        </div>
      </header>
      {desk.error ? (
        <div
          role="alert"
          className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-ink)]"
        >
          <span>{desk.error}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => void desk.refresh()}>
            Riprova
          </Button>
        </div>
      ) : null}
      <section className="mt-6" aria-label="Elenco contenuti">
        <ContentViewsToolbar
          statusFilter={statusFilter}
          viewMode={viewMode}
          savedViews={savedViews}
          workflowStates={workflowStates}
          onSetStatus={setStatusFilter}
          onSetMode={setViewMode}
          onApplyView={applyView}
          onRemoveView={removeView}
          onSaveView={() => setIsSaveViewOpen(true)}
        />
        <div className="mt-4 grid gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-4 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <Input
            label="Cerca"
            placeholder="Cerca per titolo"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            label="Stato"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.currentTarget.value)}
          >
            <option value="all">Tutti gli stati</option>
            {workflowStates.map((state) => (
              <option key={state.key} value={state.key}>
                {state.label}
              </option>
            ))}
          </Select>
          <Select
            label="Modello"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.currentTarget.value)}
          >
            <option value="all">Tutti i modelli</option>
            {desk.contentTypes.map((contentType) => (
              <option key={contentType.id} value={contentType.id}>
                {contentType.name}
              </option>
            ))}
          </Select>
        </div>
        {viewMode === "list" ? (
          <EditorialEntriesList
            entries={filteredEntries}
            contentTypeById={desk.contentTypeById}
            locale={locale}
            actionEntryId={desk.actionEntryId}
            isLoading={desk.isLoading}
            onRevisions={(entry) => void openRevisions(entry)}
            onTransition={desk.transition}
          />
        ) : (
          <EditorialEntriesBoard
            entries={filteredEntries}
            contentTypeById={desk.contentTypeById}
            locale={locale}
            actionEntryId={desk.actionEntryId}
            onRevisions={(entry) => void openRevisions(entry)}
            onTransition={desk.transition}
          />
        )}
      </section>
      <CreateEditorialEntryDialog
        open={isCreateOpen}
        contentTypes={desk.activeContentTypes}
        isCreating={desk.isCreating}
        onClose={() => setIsCreateOpen(false)}
        onCreate={desk.create}
      />
      <EntryRevisionsDialog
        entry={revisionEntry}
        revisions={revisions}
        isLoading={isLoadingRevisions}
        locale={locale}
        onClose={() => setRevisionEntry(null)}
      />
      <SaveEditorialViewDialog
        open={isSaveViewOpen}
        onClose={() => setIsSaveViewOpen(false)}
        onSave={saveView}
      />
    </main>
  );
}

function readContentTypeFilter() {
  return typeof window === "undefined"
    ? "all"
    : (new URLSearchParams(window.location.search).get("modelId") ?? "all");
}
function ContentViewsToolbar({
  statusFilter,
  viewMode,
  savedViews,
  workflowStates,
  onSetStatus,
  onSetMode,
  onApplyView,
  onRemoveView,
  onSaveView
}: {
  statusFilter: "all" | string;
  viewMode: ViewMode;
  savedViews: readonly SavedEditorialView[];
  workflowStates: readonly { key: string; label: string }[];
  onSetStatus: (status: "all" | string) => void;
  onSetMode: (mode: ViewMode) => void;
  onApplyView: (view: SavedEditorialView) => void;
  onRemoveView: (id: string) => void;
  onSaveView: () => void;
}) {
  const presets: ReadonlyArray<{ label: string; value: "all" | string }> = [
    { label: "Tutti", value: "all" },
    ...workflowStates.map((state) => ({ label: state.label, value: state.key }))
  ];
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-1 rounded-lg bg-[color:var(--color-surface-subtle)] p-1"
          aria-label="Viste preimpostate"
        >
          {presets.map((view) => (
            <button
              key={view.value}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${statusFilter === view.value ? "bg-[color:var(--color-panel)] font-medium text-[color:var(--color-ink)] shadow-[var(--shadow-sm)]" : "text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"}`}
              onClick={() => onSetStatus(view.value)}
            >
              {view.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("list")}
          >
            Elenco
          </Button>
          <Button
            type="button"
            variant={viewMode === "board" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("board")}
          >
            Board
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onSaveView}>
            <Icon name="bookmark" />
            Salva vista
          </Button>
        </div>
      </div>
      {savedViews.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--color-border)] pt-3">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-[color:var(--color-ink-subtle)]">
            Le mie viste
          </span>
          {savedViews.map((view) => (
            <span
              key={view.id}
              className="inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] pl-3 text-sm text-[color:var(--color-ink-muted)]"
            >
              <button type="button" className="py-1.5" onClick={() => onApplyView(view)}>
                {view.name}
              </button>
              <button
                type="button"
                className="px-2 py-1.5 text-[color:var(--color-ink-subtle)] hover:text-[color:var(--color-ink)]"
                aria-label={`Elimina vista ${view.name}`}
                onClick={() => onRemoveView(view.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
