import { useEffect, useMemo, useState } from "react";
import { ResourcePage } from "@trinacria-cms/trinacria-ui";
import {
  CreateEditorialEntryDialog,
  EntryRevisionsDialog
} from "./entries/editorial-entries-dialogs.js";
import { EditorialEntriesList } from "./entries/editorial-entries-list.js";
import { useEditorialEntries } from "./entries/use-editorial-entries.js";
import type { EditorialEntry, EntryRevision } from "./entries/entries.types.js";
import type { CmsClient, EditorialNavigator } from "./editorial-admin.types.js";

export interface EditorialEntriesPageContext {
  cms: CmsClient;
  locale?: string;
  navigateToRoute?: EditorialNavigator;
}

const NAVIGATION_EVENT = "trinacria-cms:backoffice-navigation";

export function EditorialEntriesPage({
  cms,
  locale = "it-IT",
  navigateToRoute
}: EditorialEntriesPageContext) {
  const desk = useEditorialEntries(cms);
  const [contentTypeFilter, setContentTypeFilter] = useState(readContentTypeFilter);
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

  const openRevisions = async (entry: EditorialEntry) => {
    setRevisionEntry(entry);
    setRevisions([]);
    setIsLoadingRevisions(true);
    setRevisions(await desk.loadRevisions(entry));
    setIsLoadingRevisions(false);
  };

  const openEntry = (entry: EditorialEntry) =>
    navigateToRoute?.("editorial-entry-detail", new URLSearchParams({ entryId: entry.id }));

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <ResourcePage feedback={desk.error ? <ErrorMessage message={desk.error} /> : undefined}>
        <EditorialEntriesList
          title={selectedContentType?.name ?? "Contenuti"}
          description={
            selectedContentType
              ? `Gestisci i contenuti di tipo ${selectedContentType.name}.`
              : "Crea e gestisci tutti i contenuti della redazione."
          }
          entries={entries}
          contentTypeById={desk.contentTypeById}
          locale={locale}
          actionEntryId={desk.actionEntryId}
          isLoading={desk.isLoading}
          canCreate={desk.activeContentTypes.length > 0}
          onCreate={() => setIsCreateOpen(true)}
          onRefresh={() => void desk.refresh()}
          onRevisions={(entry) => void openRevisions(entry)}
          onEdit={openEntry}
          onTransition={desk.transition}
        />
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
