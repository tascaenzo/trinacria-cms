import { Button, Dialog, FeedbackBanner, Icon, Input } from "@trinacria-cms/trinacria-ui";
import { useState } from "react";
import type { EditorialContentType } from "../editorial-admin.types.js";

export interface ContentModelDeleteRequest {
  mode: "soft" | "permanent";
  model: EditorialContentType;
}

export function ContentModelDeleteDialog({
  isMutating,
  onClose,
  onConfirm,
  request
}: {
  isMutating: boolean;
  onClose: () => void;
  onConfirm: (request: ContentModelDeleteRequest) => Promise<boolean>;
  request: ContentModelDeleteRequest | null;
}) {
  const [confirmationName, setConfirmationName] = useState("");
  const isPermanent = request?.mode === "permanent";
  const canConfirm = Boolean(request) && (!isPermanent || confirmationName === request.model.name);

  const close = () => {
    if (!isMutating) onClose();
  };

  const confirm = async () => {
    if (request && canConfirm && (await onConfirm(request))) onClose();
  };

  return (
    <Dialog
      open={request !== null}
      title={dialogTitle(request)}
      description={
        isPermanent
          ? "Questa operazione è irreversibile e il modello non potrà più essere ripristinato."
          : "Il modello verrà spostato tra gli eliminati e potrà essere ripristinato in seguito."
      }
      closeLabel="Chiudi"
      closeVariant="icon"
      width="md"
      onClose={close}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isMutating} onClick={close}>
            Annulla
          </Button>
          <Button
            type="button"
            isLoading={isMutating}
            disabled={!canConfirm}
            variant={isPermanent ? "danger" : "primary"}
            onClick={() => void confirm()}
          >
            <Icon name="trash-2" />
            {isPermanent ? "Elimina definitivamente" : "Elimina modello"}
          </Button>
        </>
      }
    >
      {isPermanent ? (
        <div className="grid gap-5">
          <FeedbackBanner
            tone="warning"
            message="La cancellazione è consentita solo per modelli senza contenuti. La struttura dei campi e il workflow verranno cancellati definitivamente."
          />
          <Input
            label={request ? `Scrivi “${request.model.name}” per confermare` : "Nome del modello"}
            value={confirmationName}
            disabled={isMutating}
            autoComplete="off"
            onChange={(event) => setConfirmationName(event.currentTarget.value)}
          />
        </div>
      ) : (
        <FeedbackBanner
          tone="info"
          message="Il modello non sarà più disponibile nel menu editoriale e non potrà essere modificato finché non verrà ripristinato. I modelli con contenuti non possono essere eliminati."
        />
      )}
    </Dialog>
  );
}

function dialogTitle(request: ContentModelDeleteRequest | null) {
  if (!request) return "Eliminare il modello?";
  return request.mode === "permanent"
    ? `Eliminare definitivamente ${request.model.name}?`
    : `Eliminare ${request.model.name}?`;
}
