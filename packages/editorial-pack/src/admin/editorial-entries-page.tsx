import { useEffect, useMemo, useState } from "react";
import { ResourcePage, Tabs } from "@trinacria-cms/trinacria-ui";
import {
  CreateEditorialEntryDialog,
  EntryRevisionsDialog
} from "./entries/editorial-entries-dialogs.js";
import { EditorialEntriesList } from "./entries/editorial-entries-list.js";
import { EditorialReviewBoard } from "./entries/editorial-review-board.js";
import { useEditorialEntries } from "./entries/use-editorial-entries.js";
import {
  supportsEditorialReview,
  type EditorialEntry,
  type EntryRevision
} from "./entries/entries.types.js";
import type { CmsClient, EditorialNavigator } from "./editorial-admin.types.js";

export interface EditorialEntriesPageContext {
  cms: CmsClient;
  locale?: string;
  navigateToRoute?: EditorialNavigator;
}

const NAVIGATION_EVENT = "trinacria-cms:backoffice-navigation";
type EntriesView = "table" | "review";

export function EditorialEntriesPage({
  cms,
  locale = "it-IT",
  navigateToRoute
}: EditorialEntriesPageContext) {
  const desk = useEditorialEntries(cms);
  const [contentTypeFilter, setContentTypeFilter] = useState(readContentTypeFilter);
  const [view, setView] = useState<EntriesView>("table");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [revisionEntry, setRevisionEntry] = useState<EditorialEntry | null>(null);
  const [revisions, setRevisions] = useState<readonly EntryRevision[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);

  useEffect(() => {
    const syncContentTypeFilter = () => setContentTypeFilter(readContentTypeFilter());
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

  const entries = useMemo(
    () =>
      contentTypeFilter === "all"
        ? desk.entries
        : desk.entries.filter((entry) => entry.contentTypeId === contentTypeFilter),
    [contentTypeFilter, desk.entries]
  );
  const selectedContentType = desk.contentTypeById.get(contentTypeFilter);
  const reviewContentTypes = useMemo(
    () =>
      selectedContentType
        ? supportsEditorialReview(selectedContentType)
          ? [selectedContentType]
          : []
        : desk.activeContentTypes.filter(supportsEditorialReview),
    [desk.activeContentTypes, selectedContentType]
  );
  const reviewContentTypeIds = useMemo(
    () => new Set(reviewContentTypes.map((contentType) => contentType.id)),
    [reviewContentTypes]
  );
  const reviewEntries = useMemo(
    () => entries.filter((entry) => reviewContentTypeIds.has(entry.contentTypeId)),
    [entries, reviewContentTypeIds]
  );
  const hasReviewView = reviewContentTypes.length > 0;
  const activeView = hasReviewView ? view : "table";

  const openRevisions = async (entry: EditorialEntry) => {
    setRevisionEntry(entry);
    setRevisions([]);
    setIsLoadingRevisions(true);
    setRevisions(await desk.loadRevisions(entry));
    setIsLoadingRevisions(false);
  };

  const openEntry = (entry: EditorialEntry) =>
    navigateToRoute?.(
      "editorial-entry-detail",
      new URLSearchParams({ entryId: entry.id, modelId: entry.contentTypeId })
    );

  const title = selectedContentType?.name ?? "Contenuti";
  const description = selectedContentType
    ? `Gestisci i contenuti di tipo ${selectedContentType.name}.`
    : "Crea e gestisci tutti i contenuti della redazione.";
  const sharedViewProps = {
    title,
    description,
    contentTypeById: desk.contentTypeById,
    locale,
    actionEntryId: desk.actionEntryId,
    isLoading: desk.isLoading,
    canCreate: desk.activeContentTypes.length > 0,
    onCreate: () => setIsCreateOpen(true),
    onRefresh: () => void desk.refresh(),
    onRevisions: (entry: EditorialEntry) => void openRevisions(entry),
    onEdit: openEntry,
    onTransition: desk.transition
  };
  const currentView =
    activeView === "review" ? (
      <EditorialReviewBoard
        {...sharedViewProps}
        entries={reviewEntries}
        contentTypes={reviewContentTypes}
      />
    ) : (
      <EditorialEntriesList {...sharedViewProps} entries={entries} />
    );

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <ResourcePage feedback={desk.error ? <ErrorMessage message={desk.error} /> : undefined}>
        {hasReviewView ? (
          <Tabs
            ariaLabel="Vista dei contenuti"
            items={[
              { value: "table", label: "Contenuti", count: entries.length },
              { value: "review", label: "Revisione", count: reviewEntries.length }
            ]}
            value={activeView}
            panelClassName="pt-4"
            onValueChange={(nextView) => setView(nextView as EntriesView)}
          >
            {currentView}
          </Tabs>
        ) : (
          currentView
        )}
      </ResourcePage>

      <CreateEditorialEntryDialog
        open={isCreateOpen}
        contentTypes={desk.activeContentTypes}
        initialContentTypeId={selectedContentType?.id}
        isCreating={desk.isCreating}
        onClose={() => setIsCreateOpen(false)}
        onCreate={async (contentTypeId, title) => {
          const created = await desk.create(contentTypeId, title);
          if (created) openEntry(created);
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
    </main>
  );
}

function readContentTypeFilter() {
  return typeof window === "undefined"
    ? "all"
    : (new URLSearchParams(window.location.search).get("modelId") ?? "all");
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-ink)]"
    >
      {message}
    </p>
  );
}
