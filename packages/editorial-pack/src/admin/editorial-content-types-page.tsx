import { ResourcePage, Tabs } from "@trinacria-cms/trinacria-ui";
import { useState } from "react";
import {
  ContentModelDeleteDialog,
  type ContentModelDeleteRequest
} from "./content-types/content-model-delete-dialog.js";
import { ContentModelsTable, type ModelsView } from "./content-types/content-models-table.js";
import { useContentTypes } from "./content-types/use-content-types.js";
import type { CmsClient, EditorialNavigator } from "./editorial-admin.types.js";

export interface EditorialContentTypesPageContext {
  cms: CmsClient;
  navigateToRoute?: EditorialNavigator;
}

/** Lists content models and coordinates their lifecycle actions. */
export function EditorialContentTypesPage({
  cms,
  navigateToRoute
}: EditorialContentTypesPageContext) {
  const {
    contentTypes,
    deletedContentTypes,
    deleteContentType,
    error,
    isLoading,
    isMutating,
    permanentlyDeleteContentType,
    restoreContentType
  } = useContentTypes(cms);
  const [view, setView] = useState<ModelsView>("available");
  const [deleteRequest, setDeleteRequest] = useState<ContentModelDeleteRequest | null>(null);
  const models = view === "available" ? contentTypes : deletedContentTypes;

  const confirmDelete = (request: ContentModelDeleteRequest) =>
    request.mode === "soft"
      ? deleteContentType(request.model)
      : permanentlyDeleteContentType(request.model);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
      <ResourcePage feedback={error ? <ErrorMessage message={error} /> : undefined}>
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-[var(--radius-panel)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-surface)]" />
        ) : (
          <Tabs
            ariaLabel="Stato dei modelli"
            items={[
              { value: "available", label: "Disponibili", count: contentTypes.length },
              { value: "deleted", label: "Eliminati", count: deletedContentTypes.length }
            ]}
            value={view}
            panelClassName="pt-4"
            onValueChange={(nextView) => setView(nextView as ModelsView)}
          >
            <ContentModelsTable
              models={models}
              view={view}
              onConfigure={(modelId) =>
                navigateToRoute?.("editorial-content-type", new URLSearchParams({ modelId }))
              }
              onCreate={() => navigateToRoute?.("editorial-content-type-create")}
              onDelete={(model) => setDeleteRequest({ mode: "soft", model })}
              onPermanentDelete={(model) => setDeleteRequest({ mode: "permanent", model })}
              onRestore={(model) => void restoreContentType(model)}
            />
          </Tabs>
        )}
      </ResourcePage>

      <ContentModelDeleteDialog
        key={deleteRequest ? `${deleteRequest.mode}:${deleteRequest.model.id}` : "closed"}
        request={deleteRequest}
        isMutating={isMutating}
        onClose={() => setDeleteRequest(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
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
