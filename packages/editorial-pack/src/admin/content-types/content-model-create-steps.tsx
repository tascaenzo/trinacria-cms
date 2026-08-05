import {
  Button,
  EmptyState,
  ErrorBanner,
  Icon,
  Input,
  Select,
  Textarea
} from "@trinacria-cms/trinacria-ui";
import type { ReactNode } from "react";
import { ContentTypeDetailSection } from "../content-type-detail/content-type-detail-section.js";
import { ContentTypeFieldList } from "../content-type-detail/content-type-field-list.js";
import { ContentTypeWorkflowEditor } from "../content-type-detail/content-type-workflow-editor.js";
import { CONTENT_MODEL_ICON_OPTIONS, type ContentTypeField } from "../editorial-admin.types.js";
import type { CreateContentTypeDraft } from "./use-content-types.js";

export const CREATE_STEPS = [
  { id: "identity", label: "Informazioni", description: "Nome e riconoscibilità" },
  { id: "fields", label: "Campi", description: "Dati della redazione" },
  { id: "configuration", label: "Configurazione", description: "Workflow e accesso" },
  { id: "review", label: "Riepilogo", description: "Controlla e crea" }
] as const;

export type CreateStep = (typeof CREATE_STEPS)[number]["id"];

interface CommonStepProps {
  disabled: boolean;
  progress: ReactNode;
}

export function IdentityStep({
  disabled,
  draft,
  onChange,
  onNameChange,
  progress
}: CommonStepProps & {
  draft: CreateContentTypeDraft;
  onChange: (next: Partial<CreateContentTypeDraft>) => void;
  onNameChange: (name: string) => void;
}) {
  return (
    <ContentTypeDetailSection
      title="Informazioni"
      description="Il nome sarà visibile alla redazione; lo slug viene generato automaticamente."
      headerAddon={progress}
    >
      <div className="grid gap-4">
        <Input
          label="Nome"
          value={draft.name}
          readOnly={disabled}
          onChange={(event) => onNameChange(event.currentTarget.value)}
        />
        <Input label="Slug" value={draft.key} readOnly />
        <Textarea
          label="Descrizione"
          rows={3}
          value={draft.description}
          readOnly={disabled}
          onChange={(event) => onChange({ description: event.currentTarget.value })}
        />
        <Select
          label="Icona nel menu"
          value={draft.icon}
          disabled={disabled}
          onChange={(event) => onChange({ icon: event.currentTarget.value })}
        >
          {CONTENT_MODEL_ICON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </ContentTypeDetailSection>
  );
}

export function FieldsStep({
  disabled,
  error,
  fields,
  onEdit,
  onMove,
  onNew,
  onRemove,
  progress
}: CommonStepProps & {
  error: string | null;
  fields: readonly ContentTypeField[];
  onEdit: (field: ContentTypeField) => void;
  onMove: (key: string, direction: "up" | "down") => void;
  onNew: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <ContentTypeDetailSection
      title="Campi del contenuto"
      description="Aggiungi i dati che la redazione dovrà compilare per questo modello."
      headerAddon={progress}
    >
      {error ? <ErrorBanner className="mb-4" message={error} /> : null}
      {fields.length ? (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <span className="rounded-full bg-[color:var(--color-surface-subtle)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-ink-muted)]">
              {fields.length} {fields.length === 1 ? "campo configurato" : "campi configurati"}
            </span>
            <Button type="button" size="sm" disabled={disabled} onClick={onNew}>
              <Icon name="plus" />
              Aggiungi campo
            </Button>
          </div>
          <ContentTypeFieldList
            fields={fields}
            empty=""
            disabled={disabled}
            onEdit={onEdit}
            onRemove={onRemove}
            onMove={onMove}
          />
        </>
      ) : (
        <EmptyState
          className="min-h-56 place-items-center text-center"
          title="Inizia dai campi del contenuto"
          text="Aggiungi il primo dato che la redazione dovrà compilare."
          action={
            <Button className="mt-5" type="button" size="sm" disabled={disabled} onClick={onNew}>
              <Icon name="plus" />
              Aggiungi il primo campo
            </Button>
          }
        />
      )}
    </ContentTypeDetailSection>
  );
}

export function ConfigurationStep({
  disabled,
  draft,
  onChange,
  progress
}: CommonStepProps & {
  draft: CreateContentTypeDraft;
  onChange: (next: Partial<CreateContentTypeDraft>) => void;
}) {
  return (
    <ContentTypeDetailSection
      title="Configurazione"
      description="Definisci il workflow e chi potrà gestire i contenuti."
      headerAddon={progress}
    >
      <div className="grid gap-5">
        <ContentTypeWorkflowEditor
          workflow={draft.workflow}
          disabled={disabled}
          onChange={(workflow) =>
            onChange({
              workflow,
              workflowId: workflow.preset === "direct" ? "direct" : "review"
            })
          }
        />
        <Select
          label="Accesso ai contenuti"
          value={draft.ownershipScope}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ownershipScope: event.currentTarget.value as CreateContentTypeDraft["ownershipScope"]
            })
          }
        >
          <option value="inherit">Usa le impostazioni editoriali</option>
          <option value="own_entries">Ogni autore vede i propri contenuti</option>
          <option value="all_entries">Gli autori vedono tutti i contenuti</option>
        </Select>
      </div>
    </ContentTypeDetailSection>
  );
}

export function ReviewStep({
  draft,
  progress
}: {
  draft: CreateContentTypeDraft;
  progress: ReactNode;
}) {
  const iconLabel =
    CONTENT_MODEL_ICON_OPTIONS.find((option) => option.value === draft.icon)?.label ?? draft.icon;
  const accessLabel = ACCESS_LABELS[draft.ownershipScope];

  return (
    <ContentTypeDetailSection
      title="Riepilogo"
      description="Dopo la creazione potrai modificare ogni impostazione dalla pagina del modello."
      headerAddon={progress}
    >
      <dl className="grid gap-3">
        <SummaryItem label="Nome" value={draft.name} />
        <SummaryItem label="Slug" value={draft.key} />
        <SummaryItem label="Icona" value={iconLabel} />
        <SummaryItem label="Campi" value={String(draft.fields.length)} />
        <SummaryItem label="Workflow" value={draft.workflow.name ?? "Workflow personalizzato"} />
        <SummaryItem label="Accesso" value={accessLabel} />
        {draft.description.trim() ? (
          <SummaryItem label="Descrizione" value={draft.description} />
        ) : null}
      </dl>
    </ContentTypeDetailSection>
  );
}

const ACCESS_LABELS: Record<CreateContentTypeDraft["ownershipScope"], string> = {
  inherit: "Impostazioni editoriali",
  own_entries: "Solo contenuti propri",
  all_entries: "Tutti i contenuti"
};

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg bg-[color:var(--color-surface-subtle)] px-4 py-3">
      <dt className="text-xs font-medium text-[color:var(--color-ink-muted)]">{label}</dt>
      <dd className="text-sm font-medium text-[color:var(--color-ink)]">{value}</dd>
    </div>
  );
}
