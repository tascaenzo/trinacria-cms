import { useState } from "react";
import { Button, Dialog, Input, Textarea } from "@trinacria-cms/trinacria-ui";
import type { CreateContentTypeDraft } from "./use-content-types.js";

export interface CreateContentTypeDialogProps {
  isCreating: boolean;
  onClose: () => void;
  onCreate: (draft: CreateContentTypeDraft) => Promise<boolean>;
  open: boolean;
}

export function CreateContentTypeDialog({
  isCreating,
  onClose,
  onCreate,
  open
}: CreateContentTypeDialogProps) {
  const [draft, setDraft] = useState<CreateContentTypeDraft>({
    name: "",
    key: "",
    description: ""
  });
  const submit = async () => {
    if (await onCreate(draft)) {
      setDraft({ name: "", key: "", description: "" });
      onClose();
    }
  };
  return (
    <Dialog
      open={open}
      title="Nuovo modello di contenuto"
      description="Crea la base per eventi, schede o altri contenuti."
      closeLabel="Chiudi"
      closeVariant="icon"
      onClose={() => !isCreating && onClose()}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isCreating} onClick={onClose}>
            Annulla
          </Button>
          <Button
            type="button"
            disabled={isCreating || !draft.name.trim() || !draft.key.trim()}
            onClick={() => void submit()}
          >
            {isCreating ? "Creazione…" : "Crea modello"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Input
          label="Nome"
          placeholder="Evento"
          value={draft.name}
          readOnly={isCreating}
          onChange={(event) =>
            setDraft((current) => ({ ...current, name: event.currentTarget.value }))
          }
        />
        <Input
          label="Chiave"
          hint="Minuscole, numeri e trattini; ad esempio evento."
          placeholder="evento"
          value={draft.key}
          readOnly={isCreating}
          onChange={(event) =>
            setDraft((current) => ({ ...current, key: event.currentTarget.value }))
          }
        />
        <Textarea
          label="Descrizione"
          rows={3}
          value={draft.description}
          readOnly={isCreating}
          onChange={(event) =>
            setDraft((current) => ({ ...current, description: event.currentTarget.value }))
          }
        />
      </div>
    </Dialog>
  );
}
