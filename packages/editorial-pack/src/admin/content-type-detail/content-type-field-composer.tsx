import { useEffect, useState } from "react";
import { Button, Dialog, Input, Select, Switch } from "@trinacria-cms/trinacria-ui";
import type { ContentFieldType, ContentTypeField } from "../editorial-admin.types.js";

interface FieldDraft {
  label: string;
  key: string;
  type: ContentFieldType;
  options: string;
  relationTarget: string;
  required: boolean;
  multiple: boolean;
}

const EMPTY_FIELD: FieldDraft = {
  label: "",
  key: "",
  type: "text",
  options: "",
  relationTarget: "",
  required: false,
  multiple: false
};

const FIELD_TYPE_OPTIONS: ReadonlyArray<{ value: ContentFieldType; label: string }> = [
  { value: "text", label: "Testo" },
  { value: "rich_text", label: "Testo ricco" },
  { value: "number", label: "Numero" },
  { value: "boolean", label: "Sì / No" },
  { value: "date_time", label: "Data e ora" },
  { value: "select", label: "Scelta (categoria, tag…)" },
  { value: "url", label: "URL" },
  { value: "media", label: "Media" },
  { value: "relation", label: "Relazione" },
  { value: "json", label: "JSON" },
  { value: "repeatable", label: "Gruppo ripetibile" }
];

export function ContentTypeFieldComposer({
  field,
  isSaving,
  onClose,
  onSubmit,
  open
}: {
  field: ContentTypeField | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (field: ContentTypeField) => boolean;
  open: boolean;
}) {
  const [draft, setDraft] = useState<FieldDraft>(EMPTY_FIELD);
  const isSelect = draft.type === "select";
  const isRelation = draft.type === "relation";
  const canSubmit =
    Boolean(draft.label.trim() && draft.key.trim()) &&
    (!isSelect || Boolean(draft.options.trim())) &&
    (!isRelation || Boolean(draft.relationTarget.trim()));

  useEffect(() => {
    if (open) setDraft(toFieldDraft(field));
  }, [field, open]);

  const update = (next: Partial<FieldDraft>) => setDraft((current) => ({ ...current, ...next }));

  const submit = () => {
    if (canSubmit && onSubmit(toContentTypeField(draft))) onClose();
  };

  return (
    <Dialog
      open={open}
      title={field ? "Modifica campo" : "Nuovo campo"}
      description={
        field
          ? "Aggiorna le regole di compilazione del campo."
          : "Aggiungi un dato che chi scrive dovrà compilare."
      }
      closeLabel="Chiudi"
      closeVariant="icon"
      variant="drawer"
      onClose={() => !isSaving && onClose()}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isSaving} onClick={onClose}>
            Annulla
          </Button>
          <Button type="button" disabled={isSaving || !canSubmit} onClick={submit}>
            {field ? "Salva campo" : "Crea campo"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-4">
          <Input
            label="Nome campo"
            value={draft.label}
            readOnly={isSaving}
            onChange={(event) => {
              const label = event.currentTarget.value;
              update({ label, ...(!field ? { key: fieldSlugFromLabel(label) } : {}) });
            }}
          />
          <Input label="Slug" value={draft.key} readOnly />
        </div>

        <section className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-4">
          <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">Formato del campo</h3>
          <div className="mt-4 grid gap-4">
            <Select
              label="Tipo"
              value={draft.type}
              disabled={isSaving}
              onChange={(event) => update({ type: event.currentTarget.value as ContentFieldType })}
            >
              {FIELD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {isSelect ? (
              <Input
                label="Voci disponibili"
                value={draft.options}
                readOnly={isSaving}
                onChange={(event) => update({ options: event.currentTarget.value })}
              />
            ) : null}
            {isRelation ? (
              <Input
                label="Modello collegato"
                value={draft.relationTarget}
                readOnly={isSaving}
                onChange={(event) => update({ relationTarget: event.currentTarget.value })}
              />
            ) : null}
          </div>
        </section>

        <section className="rounded-lg bg-[color:var(--color-surface-subtle)] p-4">
          <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">
            Regole di compilazione
          </h3>
          <div className="mt-4 grid gap-4">
            <Switch
              label="Obbligatorio"
              description="Chi scrive dovrà compilare questo campo."
              checked={draft.required}
              disabled={isSaving}
              onChange={(event) => update({ required: event.currentTarget.checked })}
            />
            <Switch
              label="Più valori"
              description="Permette più elementi nello stesso campo."
              checked={draft.multiple}
              disabled={isSaving}
              onChange={(event) => update({ multiple: event.currentTarget.checked })}
            />
          </div>
        </section>
      </div>
    </Dialog>
  );
}

function toFieldDraft(field: ContentTypeField | null): FieldDraft {
  if (!field) return EMPTY_FIELD;
  return {
    label: field.label,
    key: field.key,
    type: field.type,
    options: field.config?.options?.join(", ") ?? "",
    relationTarget:
      typeof field.config?.targetContentTypeId === "string" ? field.config.targetContentTypeId : "",
    required: field.required,
    multiple: field.multiple
  };
}

function toContentTypeField(draft: FieldDraft): ContentTypeField {
  const config =
    draft.type === "select"
      ? {
          options: draft.options
            .split(",")
            .map((option) => option.trim())
            .filter(Boolean)
        }
      : draft.type === "relation"
        ? { targetContentTypeId: draft.relationTarget.trim() }
        : undefined;
  return {
    key: draft.key.trim().toLowerCase(),
    label: draft.label.trim(),
    type: draft.type,
    required: draft.required,
    multiple: draft.multiple,
    ...(config ? { config } : {})
  };
}

function fieldSlugFromLabel(label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!slug) return "";
  return /^[a-z]/.test(slug) ? slug : `campo_${slug}`;
}
