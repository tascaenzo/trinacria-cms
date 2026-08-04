import {
  Button,
  ErrorBanner,
  Icon,
  Input,
  Panel,
  Select,
  Textarea
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useState } from "react";
import { ContentTypeDetailSection } from "./content-type-detail/content-type-detail-section.js";
import { ContentTypeFieldComposer } from "./content-type-detail/content-type-field-composer.js";
import { ContentTypeFieldList } from "./content-type-detail/content-type-field-list.js";
import { ContentTypeWorkflowEditor } from "./content-type-detail/content-type-workflow-editor.js";
import { useContentTypeDetail } from "./content-type-detail/use-content-type-detail.js";
import {
  type CmsClient,
  CONTENT_MODEL_ICON_OPTIONS,
  type ContentTypeField,
  type EditorialNavigator
} from "./editorial-admin.types.js";

const NAVIGATION_EVENT = "trinacria-cms:backoffice-navigation";
type FieldEditor = { mode: "create" } | { mode: "edit"; field: ContentTypeField };

export interface EditorialContentTypeDetailPageContext {
  cms: CmsClient;
  modelId?: string | null;
  navigateToRoute?: EditorialNavigator;
  onBack?: () => void;
}

/** Composes the model editor; remote and form state live in useContentTypeDetail. */
export function EditorialContentTypeDetailPage({
  cms,
  modelId: controlledModelId,
  navigateToRoute,
  onBack
}: EditorialContentTypeDetailPageContext) {
  const [routeModelId, setRouteModelId] = useState(readModelId);
  const [fieldEditor, setFieldEditor] = useState<FieldEditor | null>(null);
  const modelId = controlledModelId ?? routeModelId;
  const detail = useContentTypeDetail(cms, modelId);
  const returnToModels = onBack ?? (() => navigateToRoute?.("editorial-content-types"));

  useEffect(() => {
    if (controlledModelId !== undefined) return;
    const syncModelId = () => setRouteModelId(readModelId());
    window.addEventListener(NAVIGATION_EVENT, syncModelId);
    window.addEventListener("popstate", syncModelId);
    return () => {
      window.removeEventListener(NAVIGATION_EVENT, syncModelId);
      window.removeEventListener("popstate", syncModelId);
    };
  }, [controlledModelId]);

  if (detail.isLoading) return <LoadingDetail />;
  if (!detail.model) return <MissingDetail onBack={returnToModels} />;

  const saveField = (field: ContentTypeField) =>
    fieldEditor?.mode === "edit"
      ? detail.updateField(fieldEditor.field.key, field)
      : detail.addField(field);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
      <header>
        <h1 className="text-xl font-semibold text-[color:var(--color-ink)]">{detail.model.name}</h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Definisci i dati che la redazione compilerà e il flusso di pubblicazione.
        </p>
      </header>

      {detail.error ? <ErrorBanner className="mt-5" message={detail.error} /> : null}

      <div className="mt-6 grid gap-6">
        <ContentTypeDetailSection
          title="Informazioni"
          description="Il nome è visibile alla redazione; lo slug resta l’identificatore del modello."
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
            <Select
              label="Icona nel menu"
              value={detail.icon}
              disabled={detail.isSaving}
              onChange={(event) => detail.setIcon(event.currentTarget.value as typeof detail.icon)}
            >
              {CONTENT_MODEL_ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </ContentTypeDetailSection>

        <ContentTypeDetailSection
          title="Campi del contenuto"
          description="Vedi i campi già creati e aggiungi o modifica quelli necessari alla redazione."
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--color-ink-muted)]">
              {detail.fields.length}{" "}
              {detail.fields.length === 1 ? "campo configurato" : "campi configurati"}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={detail.isSaving}
              onClick={() => setFieldEditor({ mode: "create" })}
            >
              <Icon name="plus" />
              Nuovo campo
            </Button>
          </div>
          <ContentTypeFieldList
            fields={detail.fields}
            empty="Non hai ancora campi aggiuntivi."
            disabled={detail.isSaving}
            onEdit={(field) => setFieldEditor({ mode: "edit", field })}
            onRemove={detail.removeField}
            onMove={detail.moveField}
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
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          type="button"
          disabled={detail.isSaving || !detail.name.trim()}
          onClick={() => void detail.save()}
        >
          {detail.isSaving ? "Salvataggio…" : "Salva"}
        </Button>
      </div>

      <ContentTypeFieldComposer
        field={fieldEditor?.mode === "edit" ? fieldEditor.field : null}
        isSaving={detail.isSaving}
        open={fieldEditor !== null}
        onClose={() => setFieldEditor(null)}
        onSubmit={saveField}
      />
    </main>
  );
}

function LoadingDetail() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
      <Panel aria-hidden="true" className="h-72 animate-pulse" />
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
