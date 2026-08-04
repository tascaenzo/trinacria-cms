import type { createCmsSdkClient } from "@trinacria-cms/sdk";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardHeading,
  ErrorBanner,
  Icon,
  IconButton
} from "@trinacria-cms/trinacria-ui";
import { useCallback, useEffect, useMemo, useState } from "react";

type CmsClient = ReturnType<typeof createCmsSdkClient>;
interface Entry {
  contentTypeId: string;
  createdAt: string;
  id: string;
  status: string;
  title?: string;
}
interface Envelope<T> {
  data: T;
}
export interface EditorialWorkQueueWidgetContext {
  cms: CmsClient;
  navigateToRoute?: (id: string, params?: URLSearchParams) => void;
}

export function EditorialWorkQueueWidget({
  cms,
  navigateToRoute
}: EditorialWorkQueueWidgetContext) {
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await cms.request<Envelope<readonly Entry[]>>({
        method: "GET",
        path: "/v1/editorial/entries",
        query: { limit: 100, offset: 0 }
      });
      setEntries(result.data);
    } catch {
      setEntries([]);
      setError("Non è stato possibile caricare la coda editoriale.");
    } finally {
      setLoading(false);
    }
  }, [cms]);
  useEffect(() => {
    void load();
  }, [load]);
  const counts = useMemo(
    () => ({
      draft: entries.filter((e) => e.status === "draft").length,
      review: entries.filter((e) => e.status === "in_review").length,
      approved: entries.filter((e) => e.status === "approved").length,
      published: entries.filter((e) => e.status === "published").length
    }),
    [entries]
  );
  const createdRecently = entries.filter((entry) =>
    isCreatedInLastDays(entry.createdAt, 30)
  ).length;
  const recentEntries = [...entries]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 4);
  const workflowTotal = Math.max(entries.length, 1);
  const openEntry = (entry: Entry) =>
    navigateToRoute?.(
      "editorial-entry-detail",
      new URLSearchParams({ entryId: entry.id, modelId: entry.contentTypeId })
    );

  return (
    <Card className="h-full min-h-[360px]" padding="none" elevation="none">
      <CardHeader>
        <CardHeading
          icon="file-text"
          title="Attività editoriale"
          description="Articoli recenti e stato del workflow"
          actions={
            <>
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                icon="refresh-cw"
                label="Aggiorna coda editoriale"
                disabled={loading}
                onClick={() => void load()}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigateToRoute?.("editorial-entries")}
              >
                Apri desk
                <Icon name="arrow-right" />
              </Button>
            </>
          }
        />
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <div className="p-5">
            <ErrorBanner message={error} />
          </div>
        ) : (
          <div className="grid min-h-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.65fr)]">
            <section className="px-5 py-4">
              <div>
                <p className="text-sm font-medium text-[color:var(--color-ink)]">
                  Articoli creati di recente
                </p>
                <p className="mt-0.5 text-xs text-[color:var(--color-ink-muted)]">
                  Apri un articolo per continuare a lavorarci.
                </p>
              </div>
              {recentEntries.length ? (
                <div className="mt-3 divide-y divide-[color:var(--color-border)] border-t border-[color:var(--color-border)]">
                  {recentEntries.map((entry) => (
                    <Button
                      key={entry.id}
                      type="button"
                      variant="ghost"
                      className="grid h-auto w-full grid-cols-[minmax(0,1fr)_auto] items-center justify-stretch gap-4 rounded-none border-0 py-3 text-left shadow-none focus:ring-inset"
                      onClick={() => openEntry(entry)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[color:var(--color-ink)]">
                          {entry.title ?? "Senza titolo"}
                        </span>
                        <span className="mt-0.5 block text-xs text-[color:var(--color-ink-muted)]">
                          Creato il {formatDate(entry.createdAt)}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <EntryStatus status={entry.status} />
                        <Icon
                          name="chevron-right"
                          className="text-[color:var(--color-ink-subtle)]"
                        />
                      </span>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-sm text-[color:var(--color-ink-muted)]">
                  {loading ? "Caricamento articoli…" : "Non ci sono ancora articoli."}
                </p>
              )}
            </section>

            <aside className="border-t border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)] px-5 py-4 lg:border-l lg:border-t-0">
              <p className="text-xs font-medium text-[color:var(--color-ink-muted)]">
                Creati negli ultimi 30 giorni
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-[color:var(--color-ink)]">
                {loading ? "…" : createdRecently}
              </p>

              <div className="mt-5 border-t border-[color:var(--color-border)] pt-4">
                <p className="text-sm font-medium text-[color:var(--color-ink)]">Flusso attuale</p>
                <div className="mt-4 grid gap-3">
                  <WorkflowRow
                    label="Bozze"
                    value={loading ? null : counts.draft}
                    total={workflowTotal}
                  />
                  <WorkflowRow
                    label="In revisione"
                    value={loading ? null : counts.review}
                    total={workflowTotal}
                  />
                  <WorkflowRow
                    label="Approvati"
                    value={loading ? null : counts.approved}
                    total={workflowTotal}
                  />
                  <WorkflowRow
                    label="Pubblicati"
                    value={loading ? null : counts.published}
                    total={workflowTotal}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkflowRow({
  label,
  total,
  value
}: {
  label: string;
  total: number;
  value: number | null;
}) {
  const percentage = value === null ? 0 : Math.min(100, (value / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-[color:var(--color-ink-muted)]">{label}</span>
        <span className="font-semibold tabular-nums text-[color:var(--color-ink)]">
          {value ?? "…"}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[color:var(--color-surface-subtle)]">
        <span
          className="block h-full rounded-full bg-[color:var(--color-accent)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function EntryStatus({ status }: { status: string }) {
  const label =
    status === "draft"
      ? "Bozza"
      : status === "in_review"
        ? "In revisione"
        : status === "approved"
          ? "Approvato"
          : status === "published"
            ? "Pubblicato"
            : status;
  return (
    <span className="text-[11px] font-medium text-[color:var(--color-ink-muted)]">{label}</span>
  );
}

function isCreatedInLastDays(value: string, days: number) {
  const createdAt = new Date(value).getTime();
  return Number.isFinite(createdAt) && createdAt >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(
    new Date(value)
  );
}
