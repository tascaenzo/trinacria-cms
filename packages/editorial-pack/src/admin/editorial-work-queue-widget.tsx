import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Icon } from "@trinacria-cms/trinacria-ui";
import type { createCmsSdkClient } from "@trinacria-cms/sdk";

type CmsClient = ReturnType<typeof createCmsSdkClient>;
interface Entry {
  id: string;
  title?: string;
  status: string;
  updatedAt: string;
}
interface Envelope<T> {
  data: T;
}
export interface EditorialWorkQueueWidgetContext {
  cms: CmsClient;
  navigateToRoute?: (id: string) => void;
}

export function EditorialWorkQueueWidget({
  cms,
  navigateToRoute
}: EditorialWorkQueueWidgetContext) {
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await cms.request<Envelope<readonly Entry[]>>({
        method: "GET",
        path: "/v1/editorial/entries",
        query: { limit: 20, offset: 0 }
      });
      setEntries(result.data);
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
      published: entries.filter((e) => e.status === "published").length
    }),
    [entries]
  );
  return (
    <article className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-[var(--shadow-sm)]">
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
            Editoriale
          </p>
          <h3 className="mt-1 text-base font-semibold">Coda di lavoro</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          <Icon name="refresh-cw" className={loading ? "animate-spin" : undefined} />
        </Button>
      </header>
      <div className="grid grid-cols-3 divide-x divide-[color:var(--color-border)] border-b border-[color:var(--color-border)]">
        {[
          ["Bozze", counts.draft],
          ["Revisioni", counts.review],
          ["Pubblicati", counts.published]
        ].map(([label, value]) => (
          <div key={String(label)} className="px-4 py-3">
            <p className="text-xs text-[color:var(--color-ink-subtle)]">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{loading ? "…" : value}</p>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1 px-5 py-3">
        {entries.slice(0, 4).map((entry) => (
          <button
            key={entry.id}
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-[color:var(--color-panel-soft)]"
            onClick={() => navigateToRoute?.("editorial-entries")}
          >
            <span className="truncate text-sm font-medium">{entry.title ?? "Senza titolo"}</span>
            <span className="ml-3 text-xs text-[color:var(--color-ink-subtle)]">
              {entry.status}
            </span>
          </button>
        ))}
      </div>
      <footer className="border-t border-[color:var(--color-border)] p-3">
        <Button size="sm" variant="ghost" onClick={() => navigateToRoute?.("editorial-entries")}>
          Apri contenuti <Icon name="arrow-right" />
        </Button>
      </footer>
    </article>
  );
}
