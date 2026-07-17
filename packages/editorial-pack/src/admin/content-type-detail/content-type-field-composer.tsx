import { useState } from "react";
import { Button, Icon, Input, Select, Switch } from "@trinacria-cms/trinacria-ui";
import type { ContentFieldType, ContentTypeField } from "../editorial-admin.types.js";

export function ContentTypeFieldComposer({
  label,
  isSaving,
  onAdd
}: {
  label: string;
  isSaving: boolean;
  onAdd: (field: ContentTypeField) => boolean;
}) {
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] = useState<ContentFieldType>("text");
  const [fieldOptions, setFieldOptions] = useState("");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldMultiple, setFieldMultiple] = useState(false);
  const add = () => {
    const key = fieldKey.trim().toLowerCase();
    const labelValue = fieldLabel.trim();
    if (!key || !labelValue) return;
    const added = onAdd({
      key,
      label: labelValue,
      type: fieldType,
      required: fieldRequired,
      multiple: fieldMultiple,
      ...(fieldType === "select" && fieldOptions.trim()
        ? {
            config: {
              options: fieldOptions
                .split(",")
                .map((option) => option.trim())
                .filter(Boolean)
            }
          }
        : {})
    });
    if (!added) return;
    setFieldLabel("");
    setFieldKey("");
    setFieldType("text");
    setFieldOptions("");
    setFieldRequired(false);
    setFieldMultiple(false);
  };
  return (
    <div className="mt-5 rounded-lg bg-[color:var(--color-surface-subtle)] p-4 sm:p-5">
      <div>
        <p className="text-sm font-semibold text-[color:var(--color-ink)]">{label}</p>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          Dai un nome al campo e scegli come deve essere compilato.
        </p>
      </div>
      <div className="mt-5 grid gap-4">
        <Input
          label="Nome visibile"
          value={fieldLabel}
          placeholder={fieldType === "select" ? "Categoria" : "Data evento"}
          readOnly={isSaving}
          onChange={(event) => setFieldLabel(event.currentTarget.value)}
        />
        <Input
          label="ID tecnico"
          hint="Usa lettere minuscole e trattini bassi."
          value={fieldKey}
          placeholder={fieldType === "select" ? "categoria" : "data_evento"}
          readOnly={isSaving}
          onChange={(event) => setFieldKey(event.currentTarget.value)}
        />
        <Select
          label="Tipo"
          value={fieldType}
          disabled={isSaving}
          onChange={(event) => setFieldType(event.currentTarget.value as ContentFieldType)}
        >
          <option value="text">Testo</option>
          <option value="rich_text">Testo ricco</option>
          <option value="number">Numero</option>
          <option value="boolean">Sì / No</option>
          <option value="date_time">Data e ora</option>
          <option value="select">Scelta (categoria, tag…)</option>
          <option value="url">URL</option>
          <option value="media">Media</option>
        </Select>
        <div className="grid gap-3">
          <Switch
            label="Obbligatorio"
            description="Chi scrive dovrà compilare questo campo."
            checked={fieldRequired}
            disabled={isSaving}
            onChange={(event) => setFieldRequired(event.currentTarget.checked)}
          />
          <Switch
            label="Più valori"
            description="Permette di aggiungere più elementi allo stesso campo."
            checked={fieldMultiple}
            disabled={isSaving}
            onChange={(event) => setFieldMultiple(event.currentTarget.checked)}
          />
        </div>
      </div>
      {fieldType === "select" ? (
        <Input
          label="Voci disponibili"
          hint="Separate da virgole."
          value={fieldOptions}
          placeholder="Tecnologia, Cultura, Lifestyle"
          readOnly={isSaving}
          onChange={(event) => setFieldOptions(event.currentTarget.value)}
        />
      ) : null}
      <div className="mt-5 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isSaving || !fieldLabel.trim() || !fieldKey.trim()}
          onClick={add}
        >
          <Icon name="plus" />
          Aggiungi campo
        </Button>
      </div>
    </div>
  );
}
