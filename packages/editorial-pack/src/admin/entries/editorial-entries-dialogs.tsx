import { useEffect, useState } from "react";
import { Button, Dialog, Input, Select } from "@trinacria-cms/trinacria-ui";
import {
  formatEditorialDate,
  type EditorialEntry,
  type EditorialEntryContentType,
  type EntryRevision
} from "./entries.types.js";

export function CreateEditorialEntryDialog({
  contentTypes,
  isCreating,
  onClose,
  onCreate,
  open
}: {
  contentTypes: readonly EditorialEntryContentType[];
  isCreating: boolean;
  onClose: () => void;
  onCreate: (contentTypeId: string, title: string) => Promise<EditorialEntry | null>;
  open: boolean;
}) {
  const [contentTypeId, setContentTypeId] = useState("");
  const [title, setTitle] = useState("");
  useEffect(
    () => setContentTypeId((current) => current || contentTypes[0]?.id || ""),
    [contentTypes]
  );
  const create = async () => {
    if (contentTypeId && (await onCreate(contentTypeId, title))) {
      setTitle("");
      onClose();
    }
  };
  return (
    <Dialog
      open={open}
      title="Nuovo contenuto"
      description="Verrà creata una bozza."
      closeLabel="Chiudi"
      closeVariant="icon"
      variant="drawer"
      onClose={() => !isCreating && onClose()}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isCreating} onClick={onClose}>
            Annulla
          </Button>
          <Button
            type="button"
            disabled={isCreating || !contentTypeId}
            onClick={() => void create()}
          >
            {isCreating ? "Creazione…" : "Crea bozza"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Select
          label="Modello di contenuto"
          value={contentTypeId}
          disabled={isCreating}
          onChange={(event) => setContentTypeId(event.currentTarget.value)}
        >
          {contentTypes.map((contentType) => (
            <option key={contentType.id} value={contentType.id}>
              {contentType.name}
            </option>
          ))}
        </Select>
        <Input
          label="Titolo provvisorio"
          value={title}
          readOnly={isCreating}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
      </div>
    </Dialog>
  );
}
export function EntryRevisionsDialog({
  entry,
  isLoading,
  locale,
  onClose,
  revisions
}: {
  entry: EditorialEntry | null;
  isLoading: boolean;
  locale: string;
  onClose: () => void;
  revisions: readonly EntryRevision[];
}) {
  return (
    <Dialog
      open={entry !== null}
      title={entry ? `Cronologia · ${entry.title ?? "Senza titolo"}` : "Cronologia"}
      description="Le modifiche di workflow vengono salvate come revisioni."
      closeLabel="Chiudi"
      closeVariant="icon"
      onClose={onClose}
    >
      {isLoading ? (
        <p className="text-sm text-[color:var(--color-ink-muted)]">Caricamento cronologia…</p>
      ) : revisions.length ? (
        <ol className="grid gap-3">
          {revisions.map((revision) => (
            <li
              key={revision.id}
              className="rounded-lg border border-[color:var(--color-border)] p-3"
            >
              <p className="text-sm font-medium text-[color:var(--color-ink)]">
                Revisione {revision.revisionNumber}
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                {revision.reason} · {formatEditorialDate(revision.createdAt, locale)}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Non esistono ancora revisioni per questo contenuto.
        </p>
      )}
    </Dialog>
  );
}
export function SaveEditorialViewDialog({
  onClose,
  onSave,
  open
}: {
  onClose: () => void;
  onSave: (name: string) => void;
  open: boolean;
}) {
  const [name, setName] = useState("");
  const save = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    setName("");
    onClose();
  };
  return (
    <Dialog
      open={open}
      title="Salva questa vista"
      description="Conserva filtri e modalità di visualizzazione."
      closeLabel="Chiudi"
      closeVariant="icon"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Annulla
          </Button>
          <Button type="button" disabled={!name.trim()} onClick={save}>
            Salva vista
          </Button>
        </>
      }
    >
      <Input
        label="Nome della vista"
        placeholder="Le mie bozze"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
      />
    </Dialog>
  );
}
