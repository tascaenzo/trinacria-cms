import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Input, Select } from "@trinacria-cms/trinacria-ui";
import { EditorialEntriesBoard } from "./entries/editorial-entries-board.js";
import {
  EditorialContentViewsToolbar,
  type EditorialViewMode
} from "./entries/editorial-content-views-toolbar.js";
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
import type { CmsClient, EditorialNavigator } from "./editorial-admin.types.js";

export interface EditorialEntriesPageContext {
  cms: CmsClient;
  locale?: string;
  navigateToRoute?: EditorialNavigator;
}
const NAVIGATION_EVENT = "trinacria-cms:backoffice-navigation";

/** Composes the content desk; requests and reusable views live in entries/. */
export function EditorialEntriesPage({
  cms,
  locale = "it-IT",
  navigateToRoute
}: EditorialEntriesPageContext) {
  const desk = useEditorialEntries(cms);
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [typeFilter, setTypeFilter] = useState(readContentTypeFilter);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<EditorialViewMode>("list");
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
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") === "1" && desk.activeContentTypes.length) {
      setIsCreateOpen(true);
    }
  }, [desk.activeContentTypes.length]);
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
        <EditorialContentViewsToolbar
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
            onEdit={(entry) =>
              navigateToRoute?.(
                "editorial-entry-detail",
                new URLSearchParams({ entryId: entry.id })
              )
            }
            onTransition={desk.transition}
          />
        ) : (
          <EditorialEntriesBoard
            entries={filteredEntries}
            contentTypeById={desk.contentTypeById}
            locale={locale}
            actionEntryId={desk.actionEntryId}
            onRevisions={(entry) => void openRevisions(entry)}
            onEdit={(entry) =>
              navigateToRoute?.(
                "editorial-entry-detail",
                new URLSearchParams({ entryId: entry.id })
              )
            }
            onTransition={desk.transition}
          />
        )}
      </section>
      <CreateEditorialEntryDialog
        open={isCreateOpen}
        contentTypes={desk.activeContentTypes}
        isCreating={desk.isCreating}
        onClose={() => setIsCreateOpen(false)}
        onCreate={async (contentTypeId, title) => {
          const created = await desk.create(contentTypeId, title);
          if (created) {
            navigateToRoute?.(
              "editorial-entry-detail",
              new URLSearchParams({ entryId: created.id })
            );
          }
          return created;
        }}
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
