import { Button, Stepper } from "@trinacria-cms/trinacria-ui";
import { useState } from "react";
import { ContentTypeFieldComposer } from "./content-type-detail/content-type-field-composer.js";
import { workflowFromPreset } from "./content-type-detail/content-workflow-presets.js";
import {
  hasDuplicateFieldKey,
  moveField,
  upsertField
} from "./content-types/content-field-collection.js";
import {
  ConfigurationStep,
  CREATE_STEPS,
  type CreateStep,
  FieldsStep,
  IdentityStep,
  ReviewStep
} from "./content-types/content-model-create-steps.js";
import {
  type CreateContentTypeDraft,
  useCreateContentType
} from "./content-types/use-content-types.js";
import type { CmsClient, ContentTypeField, EditorialNavigator } from "./editorial-admin.types.js";

const INITIAL_DRAFT: CreateContentTypeDraft = {
  name: "",
  key: "",
  description: "",
  icon: "file-text",
  workflowId: "review",
  ownershipScope: "inherit",
  fields: [],
  workflow: workflowFromPreset("review")
};

type FieldEditor = { mode: "create" } | { mode: "edit"; field: ContentTypeField };

export interface EditorialCreateContentTypePageContext {
  cms: CmsClient;
  navigateToRoute?: EditorialNavigator;
}

export function EditorialCreateContentTypePage({
  cms,
  navigateToRoute
}: EditorialCreateContentTypePageContext) {
  const [step, setStep] = useState<CreateStep>("identity");
  const [draft, setDraft] = useState<CreateContentTypeDraft>(INITIAL_DRAFT);
  const [fieldEditor, setFieldEditor] = useState<FieldEditor | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { create, error, isCreating } = useCreateContentType(cms);
  const stepIndex = CREATE_STEPS.findIndex((item) => item.id === step);
  const isLastStep = stepIndex === CREATE_STEPS.length - 1;
  const canContinue = step !== "identity" || Boolean(draft.name.trim() && draft.key.trim());
  const progress = (
    <Stepper items={CREATE_STEPS} currentStep={step} ariaLabel="Creazione modello di documento" />
  );

  const updateDraft = (next: Partial<CreateContentTypeDraft>) =>
    setDraft((current) => ({ ...current, ...next }));

  const updateFields = (update: (fields: readonly ContentTypeField[]) => ContentTypeField[]) =>
    setDraft((current) => ({ ...current, fields: update(current.fields) }));

  const saveField = (field: ContentTypeField) => {
    const originalKey = fieldEditor?.mode === "edit" ? fieldEditor.field.key : null;
    if (hasDuplicateFieldKey(draft.fields, field.key, originalKey ?? undefined)) {
      setFieldError(`La chiave "${field.key}" è già in uso in questo modello.`);
      return false;
    }

    setFieldError(null);
    updateFields((fields) => upsertField(fields, field, originalKey ?? undefined));
    return true;
  };

  const reorderField = (key: string, direction: "up" | "down") =>
    updateFields((fields) => [...moveField(fields, key, direction)]);

  const createModel = async () => {
    const model = await create(draft);
    if (model) {
      navigateToRoute?.("editorial-content-type", new URLSearchParams({ modelId: model.id }));
    }
  };

  const continueFlow = () => {
    const nextStep = CREATE_STEPS[stepIndex + 1];
    if (isLastStep) void createModel();
    else if (nextStep) setStep(nextStep.id);
  };

  return (
    <main className="w-full px-5 py-6 sm:px-8">
      <header>
        <h1 className="text-xl font-semibold text-[color:var(--color-ink)]">
          Nuovo modello di documento
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Definisci una base pronta per la redazione, poi completa i dettagli dalla pagina del
          modello.
        </p>
      </header>

      {error ? <ErrorMessage message={error} /> : null}

      <div className="mt-8">
        {step === "identity" ? (
          <IdentityStep
            draft={draft}
            disabled={isCreating}
            progress={progress}
            onChange={updateDraft}
            onNameChange={(name) => updateDraft({ name, key: contentModelSlugFromName(name) })}
          />
        ) : null}
        {step === "fields" ? (
          <FieldsStep
            fields={draft.fields}
            disabled={isCreating}
            error={fieldError}
            progress={progress}
            onEdit={(field) => setFieldEditor({ mode: "edit", field })}
            onMove={reorderField}
            onNew={() => setFieldEditor({ mode: "create" })}
            onRemove={(key) =>
              updateFields((fields) => fields.filter((field) => field.key !== key))
            }
          />
        ) : null}
        {step === "configuration" ? (
          <ConfigurationStep
            draft={draft}
            disabled={isCreating}
            progress={progress}
            onChange={updateDraft}
          />
        ) : null}
        {step === "review" ? <ReviewStep draft={draft} progress={progress} /> : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        {stepIndex > 0 ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isCreating}
            onClick={() => setStep(CREATE_STEPS[stepIndex - 1]!.id)}
          >
            Indietro
          </Button>
        ) : null}
        <Button type="button" disabled={isCreating || !canContinue} onClick={continueFlow}>
          {isLastStep ? (isCreating ? "Creazione…" : "Crea modello") : "Continua"}
        </Button>
      </div>

      <ContentTypeFieldComposer
        field={fieldEditor?.mode === "edit" ? fieldEditor.field : null}
        isSaving={isCreating}
        open={fieldEditor !== null}
        onClose={() => setFieldEditor(null)}
        onSubmit={saveField}
      />
    </main>
  );
}

function contentModelSlugFromName(name: string) {
  const key = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!key) return "";
  return /^[a-z]/.test(key) ? key : `modello-${key}`;
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-6 rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-ink)]"
    >
      {message}
    </p>
  );
}
