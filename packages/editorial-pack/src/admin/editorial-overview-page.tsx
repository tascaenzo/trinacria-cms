import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Icon, StatCard, SummaryGrid } from "@trinacria-cms/trinacria-ui";
import type {
  CmsClient,
  EditorialContentType,
  EditorialEntryRecord,
  EditorialNavigator
} from "./editorial-admin.types.js";
import { toEditorialDisplayError } from "./lib/editorial-admin-errors.js";

const STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  in_review: "In revisione",
  approved: "Approvato",
  published: "Pubblicato"
};

export interface EditorialOverviewPageContext {
  cms: CmsClient;
  navigateToRoute?: EditorialNavigator;
}

/** Editorial landing page: shared operating picture with permission-aware shortcuts. */
export function EditorialOverviewPage({ cms, navigateToRoute }: EditorialOverviewPageContext) {
  const [entries, setEntries] = useState<readonly EditorialEntryRecord[]>([]);
  const [contentTypes, setContentTypes] = useState<readonly EditorialContentType[]>([]);
  const [canManageModels, setCanManageModels] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await cms.auth.getAuthenticatedUser();
      const [entryResult, modelResult, permissionResult] = await Promise.all([
        cms.request<{ data: readonly EditorialEntryRecord[] }>({
          method: "GET",
          path: "/v1/editorial/entries",
          query: { limit: 100, offset: 0 }
        }),
        cms.request<{ data: readonly EditorialContentType[] }>({
          method: "GET",
          path: "/v1/editorial/content-types",
          query: { limit: 100, offset: 0 }
        }),
        cms.security.listUserEffectivePermissions({ path: { id: user.data.id } })
      ]);
      setEntries(entryResult.data);
      setContentTypes(modelResult.data);
      setCanManageModels(permissionResult.data.includes("editorial-pack:content-types:manage"));
    } catch (currentError) {
      setError(
        toEditorialDisplayError(
          currentError,
          "Non è stato possibile caricare la panoramica editoriale."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [cms]);

  useEffect(() => void load(), [load]);

  const counts = useMemo(
    () => ({
      draft: entries.filter((entry) => entry.status === "draft").length,
      review: entries.filter((entry) => entry.status === "in_review").length,
      published: entries.filter((entry) => entry.status === "published").length,
      models: contentTypes.filter((model) => model.status === "active").length
    }),
    [contentTypes, entries]
  );
  const recentEntries = entries.slice(0, 6);
  const openEntry = (entry: EditorialEntryRecord) =>
    navigateToRoute?.("editorial-entry-detail", new URLSearchParams({ entryId: entry.id }));

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[color:var(--color-ink-subtle)]">
            Editoriale
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[color:var(--color-ink)]">Panoramica</h1>
          <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
            Stato dei contenuti e accesso rapido alle attività principali.
          </p>
        </div>
        <div className="flex gap-2">
          {canManageModels ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigateToRoute?.("editorial-content-types")}
            >
              <Icon name="layers" />
              Modelli
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={() => navigateToRoute?.("editorial-entries")}>
            <Icon name="plus" />
            Nuovo contenuto
          </Button>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-ink)]"
        >
          {error}
        </p>
      ) : null}

      <SummaryGrid className="mt-6" aria-label="Riepilogo editoriale">
        <StatCard label="Bozze" value={counts.draft} icon="file-text" />
        <StatCard label="In revisione" value={counts.review} icon="circle-alert" tone="warning" />
        <StatCard label="Pubblicati" value={counts.published} icon="check" tone="success" />
        <StatCard label="Modelli attivi" value={counts.models} icon="layers" />
      </SummaryGrid>

      <RecentEntries
        entries={recentEntries}
        isLoading={isLoading}
        onOpen={openEntry}
        onShowAll={() => navigateToRoute?.("editorial-entries")}
      />
    </main>
  );
}

function RecentEntries({
  entries,
  isLoading,
  onOpen,
  onShowAll
}: {
  entries: readonly EditorialEntryRecord[];
  isLoading: boolean;
  onOpen: (entry: EditorialEntryRecord) => void;
  onShowAll: () => void;
}) {
  return (
    <section className="mt-7 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)]">
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4">
        <div>
          <h2 className="font-semibold text-[color:var(--color-ink)]">Contenuti recenti</h2>
          <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
            Apri un contenuto per continuare a lavorarci.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onShowAll}>
          Vedi tutti
        </Button>
      </header>

      {isLoading ? (
        <div className="h-52 animate-pulse bg-[color:var(--color-surface-subtle)]" />
      ) : entries.length ? (
        <ul>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-4 border-b border-[color:var(--color-border)] px-5 py-3 last:border-0"
            >
              <div className="min-w-0">
                <button
                  type="button"
                  className="max-w-full truncate text-left text-sm font-medium text-[color:var(--color-ink)] hover:underline"
                  onClick={() => onOpen(entry)}
                >
                  {entry.title ?? "Senza titolo"}
                </button>
                <p className="mt-1 text-xs text-[color:var(--color-ink-subtle)]">
                  {STATUS_LABELS[entry.status] ?? entry.status} · {formatDate(entry.updatedAt)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpen(entry)}>
                Apri
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-5 text-sm text-[color:var(--color-ink-muted)]">
          Non ci sono ancora contenuti.
        </p>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
