import { useState } from "react";
import { Button, Icon } from "@trinacria-cms/trinacria-ui";
import { ContentTypeCard } from "./content-types/content-type-card.js";
import { CreateContentTypeDialog } from "./content-types/create-content-type-dialog.js";
import { useContentTypes } from "./content-types/use-content-types.js";
import type { CmsClient, EditorialNavigator } from "./editorial-admin.types.js";

export interface EditorialContentTypesPageContext {
  cms: CmsClient;
  navigateToRoute?: EditorialNavigator;
}

/** Index page: its only responsibilities are navigation and list composition. */
export function EditorialContentTypesPage({
  cms,
  navigateToRoute
}: EditorialContentTypesPageContext) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { contentTypes, error, isCreating, isLoading, create, refresh, toggleStatus } =
    useContentTypes(cms);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-[color:var(--color-ink)]">
            Modelli di contenuto
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
            Definisci la struttura e il flusso dei tuoi contenuti.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => void refresh()}
          >
            <Icon name="refresh-cw" className={isLoading ? "animate-spin" : undefined} />
            Aggiorna
          </Button>
          <Button type="button" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Icon name="plus" />
            Nuovo modello
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
              onClick={() => void refresh()}
            >
              Riprova
            </Button>
          </div>
        ) : null}
        {!error && isLoading ? <ContentTypeSkeleton /> : null}
        {!error && !isLoading && contentTypes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {contentTypes.map((contentType) => (
              <ContentTypeCard
                key={contentType.id}
                contentType={contentType}
                onCreateContent={() => navigateToRoute?.("editorial-entries")}
                onConfigure={() =>
                  navigateToRoute?.(
                    "editorial-content-type",
                    new URLSearchParams({ modelId: contentType.id })
                  )
                }
                onToggleStatus={() => void toggleStatus(contentType)}
              />
            ))}
          </div>
        ) : null}
        {!error && !isLoading && contentTypes.length === 0 ? <EmptyContentTypes /> : null}
      </section>
      <CreateContentTypeDialog
        open={isCreateOpen}
        isCreating={isCreating}
        onClose={() => setIsCreateOpen(false)}
        onCreate={create}
      />
    </main>
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
function EmptyContentTypes() {
  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-[color:var(--color-border-strong)] p-6 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] text-[color:var(--color-ink-subtle)]">
          <Icon name="file-text" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-[color:var(--color-ink)]">
          Nessun modello disponibile
        </h2>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Articoli e Pagine vengono creati automaticamente al primo avvio.
        </p>
      </div>
    </div>
  );
}
