import { useEffect, useState } from "react";
import { Button, Icon, Input, Switch, Textarea } from "@trinacria-cms/trinacria-ui";
import { ContentTypeDetailSection } from "./content-type-detail/content-type-detail-section.js";
import { ContentTypeFieldComposer } from "./content-type-detail/content-type-field-composer.js";
import { ContentTypeFieldList } from "./content-type-detail/content-type-field-list.js";
import { ContentTypeWorkflowEditor } from "./content-type-detail/content-type-workflow-editor.js";
import { useContentTypeDetail } from "./content-type-detail/use-content-type-detail.js";
import type { CmsClient, EditorialNavigator } from "./editorial-admin.types.js";

const NAVIGATION_EVENT = "trinacria-cms:backoffice-navigation";

export interface EditorialContentTypeDetailPageContext {
  cms: CmsClient;
  navigateToRoute?: EditorialNavigator;
}

/** Page composition only; editing and remote state live in content-type-detail/. */
export function EditorialContentTypeDetailPage({
  cms,
  navigateToRoute
}: EditorialContentTypeDetailPageContext) {
  const [modelId, setModelId] = useState(readModelId);
  const detail = useContentTypeDetail(cms, modelId);

  useEffect(() => {
    const syncModelId = () => setModelId(readModelId());
    window.addEventListener(NAVIGATION_EVENT, syncModelId);
    window.addEventListener("popstate", syncModelId);
    return () => {
      window.removeEventListener(NAVIGATION_EVENT, syncModelId);
      window.removeEventListener("popstate", syncModelId);
    };
  }, []);

  if (detail.isLoading) return <LoadingDetail />;
  if (!detail.model)
    return <MissingDetail onBack={() => navigateToRoute?.("editorial-content-types")} />;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Torna ai modelli"
            title="Torna ai modelli"
            onClick={() => navigateToRoute?.("editorial-content-types")}
          >
            <Icon name="arrow-left" />
          </Button>
          <h1 className="truncate text-lg font-semibold text-[color:var(--color-ink)]">
            {detail.model.name}
          </h1>
          <span className="hidden rounded bg-[color:var(--color-surface-subtle)] px-2 py-1 font-mono text-xs text-[color:var(--color-ink-subtle)] sm:inline">
            {detail.model.key}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={detail.isSaving || !detail.name.trim()}
          onClick={() => void detail.save()}
        >
          {detail.isSaving ? "Salvataggio…" : "Salva"}
        </Button>
      </header>
      {detail.error ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-ink)]"
        >
          {detail.error}
        </p>
      ) : null}
      {detail.message ? (
        <p className="mt-5 text-sm font-medium text-[color:var(--color-success-ink)]">
          {detail.message}
        </p>
      ) : null}
      <div className="mt-6 grid gap-6">
        <ContentTypeDetailSection
          title="Informazioni"
          description="Il nome è visibile alla redazione; la chiave resta l’identificatore tecnico."
        >
          <div className="grid gap-4">
            <Input
              label="Nome"
              value={detail.name}
              readOnly={detail.isSaving}
              onChange={(event) => detail.setName(event.currentTarget.value)}
            />
            <Textarea
              label="Descrizione"
              rows={3}
              value={detail.description}
              readOnly={detail.isSaving}
              onChange={(event) => detail.setDescription(event.currentTarget.value)}
            />
          </div>
        </ContentTypeDetailSection>
        <ContentTypeDetailSection
          title="Campi del contenuto"
          description="Aggiungi solo ciò che chi scrive deve compilare oltre a titolo, slug e corpo."
        >
          <ContentTypeFieldList
            fields={detail.fields}
            empty="Non hai ancora campi aggiuntivi."
            onRemove={detail.removeField}
          />
          <ContentTypeFieldComposer
            label="Nuovo campo"
            isSaving={detail.isSaving}
            onAdd={detail.addField}
          />
        </ContentTypeDetailSection>
        <ContentTypeDetailSection
          title="Workflow operativo"
          description="Scegli un preset oppure definisci stati e passaggi su misura."
        >
          <ContentTypeWorkflowEditor
            workflow={detail.workflow}
            disabled={detail.isSaving}
            onChange={detail.setWorkflow}
          />
        </ContentTypeDetailSection>
        <ContentTypeDetailSection
          title="Navigazione"
          description="Rendi questo modello disponibile come vista dedicata nel menu principale."
        >
          <Switch
            label="Aggiungi al menu principale"
            description="Apre direttamente l’elenco filtrato su questo modello di contenuto."
            checked={detail.showInMainNavigation}
            disabled={detail.isSaving}
            onChange={(event) => detail.setShowInMainNavigation(event.currentTarget.checked)}
          />
        </ContentTypeDetailSection>
      </div>
    </main>
  );
}
function LoadingDetail() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
      <div className="h-72 animate-pulse rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)]" />
    </main>
  );
}
function MissingDetail({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <Button type="button" variant="ghost" onClick={onBack}>
        <Icon name="arrow-left" />
        Torna ai modelli
      </Button>
      <h1 className="mt-6 text-2xl font-semibold text-[color:var(--color-ink)]">
        Modello non trovato
      </h1>
      <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
        Scegli un modello dall’elenco per configurarlo.
      </p>
    </main>
  );
}
function readModelId() {
  return typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("modelId");
}
