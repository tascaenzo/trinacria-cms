import { useCallback, useEffect, useState } from "react";
import { Button, Icon } from "@trinacria-cms/trinacria-ui";
import type { createCmsSdkClient } from "@trinacria-cms/sdk";

type CmsClient = ReturnType<typeof createCmsSdkClient>;

interface ApiEnvelope<T> {
  data: T;
}

interface ContentTypeField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface ContentType {
  id: string;
  key: string;
  name: string;
  description?: string;
  icon?: string;
  status: "active" | "archived";
  fields: readonly ContentTypeField[];
  taxonomyIds: readonly string[];
  updatedAt: string;
}

export interface EditorialContentTypesPageContext {
  cms: CmsClient;
  navigateToRoute?: (routeId: string) => void;
}

/** Lists the editorial models available to authors, including the blog defaults. */
export function EditorialContentTypesPage({
  cms,
  navigateToRoute
}: EditorialContentTypesPageContext) {
  const [contentTypes, setContentTypes] = useState<readonly ContentType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadContentTypes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await cms.request<ApiEnvelope<readonly ContentType[]>>({
        method: "GET",
        path: "/v1/editorial/content-types",
        query: { limit: 100, offset: 0 }
      });
      setContentTypes(response.data);
    } catch (currentError) {
      setContentTypes([]);
      setError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }, [cms]);

  useEffect(() => {
    void loadContentTypes();
  }, [loadContentTypes]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-[color:var(--color-border)] pb-6 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
            Editoriale
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[color:var(--color-ink)]">
            Modelli di contenuto
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--color-ink-muted)]">
            Articoli e pagine sono pronti all&apos;uso. Da qui potrai aggiungere modelli come
            eventi, schede prodotto o qualsiasi altro contenuto della tua redazione.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => void loadContentTypes()}
          >
            <Icon name="refresh-cw" className={isLoading ? "animate-spin" : undefined} />
            Aggiorna
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => navigateToRoute?.("editorial-entries")}
          >
            <Icon name="plus" />
            Nuovo contenuto
          </Button>
        </div>
      </header>

      <section className="mt-6" aria-label="Modelli disponibili">
        {error ? (
          <div className="rounded-xl border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-5">
            <p className="text-sm font-medium text-[color:var(--color-danger-ink)]">{error}</p>
            <Button
              className="mt-3"
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadContentTypes()}
            >
              Riprova
            </Button>
          </div>
        ) : isLoading ? (
          <ContentTypeSkeleton />
        ) : contentTypes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {contentTypes.map((contentType) => (
              <ContentTypeCard
                key={contentType.id}
                contentType={contentType}
                onCreate={() => navigateToRoute?.("editorial-entries")}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[color:var(--color-border-strong)] p-6 text-center">
            <div>
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] text-[color:var(--color-ink-subtle)]">
                <Icon name="file-text" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-[color:var(--color-ink)]">
                Nessun modello disponibile
              </h2>
              <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
                Riavvia l&apos;applicazione: Articoli e Pagine vengono creati automaticamente al primo avvio.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function ContentTypeCard({
  contentType,
  onCreate
}: {
  contentType: ContentType;
  onCreate: () => void;
}) {
  const isActive = contentType.status === "active";
  return (
    <article className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] text-[color:var(--color-ink-muted)]">
            <Icon name={contentType.icon ?? "file-text"} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[color:var(--color-ink)]">
              {contentType.name}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-[color:var(--color-ink-subtle)]">
              {contentType.key}
            </p>
          </div>
        </div>
        <span
          className={
            isActive
              ? "rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700"
              : "rounded-full bg-slate-500/10 px-2 py-1 text-[11px] font-medium text-slate-600"
          }
        >
          {isActive ? "Attivo" : "Archiviato"}
        </span>
      </div>

      <p className="mt-4 min-h-10 text-sm leading-5 text-[color:var(--color-ink-muted)]">
        {contentType.description ?? "Nessuna descrizione configurata."}
      </p>

      <dl className="mt-5 grid grid-cols-2 border-y border-[color:var(--color-border)] py-3">
        <ModelMetric label="Campi" value={String(contentType.fields.length)} />
        <ModelMetric label="Tassonomie" value={String(contentType.taxonomyIds.length)} />
      </dl>

      <footer className="mt-4 flex justify-end">
        <Button type="button" variant="ghost" size="sm" disabled={!isActive} onClick={onCreate}>
          Crea contenuto
          <Icon name="arrow-right" />
        </Button>
      </footer>
    </article>
  );
}

function ModelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-[color:var(--color-ink-subtle)]">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--color-ink)]">
        {value}
      </dd>
    </div>
  );
}

function ContentTypeSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-label="Caricamento modelli di contenuto">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="h-56 animate-pulse rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)]"
        />
      ))}
    </div>
  );
}

function toDisplayError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Non è stato possibile caricare i modelli di contenuto.";
}
