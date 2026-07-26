import { useState } from "react";
import { Button, Dialog, Icon, Input } from "@trinacria-cms/trinacria-ui";
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
            className={
              isPermanent
                ? "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-ink)] text-white hover:opacity-90"
                : undefined
            }
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
          <Notice tone="danger" icon="triangle-alert">
            Verranno cancellati per sempre la struttura dei campi e il workflow associato a questo
            modello. I contenuti già creati resteranno memorizzati, ma non saranno più accessibili
            dalla redazione.
          </Notice>
          <Input
            label={request ? `Scrivi “${request.model.name}” per confermare` : "Nome del modello"}
            value={confirmationName}
            disabled={isMutating}
            autoComplete="off"
            onChange={(event) => setConfirmationName(event.currentTarget.value)}
          />
        </div>
      ) : (
        <Notice tone="neutral" icon="info">
          Il modello non sarà più disponibile nel menu editoriale e non potrà essere modificato
          finché non verrà ripristinato.
        </Notice>
      )}
    </Dialog>
  );
}

function Notice({
  children,
  icon,
  tone
}: {
  children: string;
  icon: "info" | "triangle-alert";
  tone: "neutral" | "danger";
}) {
  const isDanger = tone === "danger";
  return (
    <div
      className={`flex gap-3 rounded-lg border p-4 ${
        isDanger
          ? "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)]"
      }`}
    >
      <Icon
        name={icon}
        className={
          isDanger
            ? "mt-0.5 text-[color:var(--color-danger-ink)]"
            : "mt-0.5 text-[color:var(--color-ink-subtle)]"
        }
      />
      <p
        className={`text-sm leading-6 ${
          isDanger ? "text-[color:var(--color-danger-ink)]" : "text-[color:var(--color-ink-muted)]"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

function dialogTitle(request: ContentModelDeleteRequest | null) {
  if (!request) return "Eliminare il modello?";
  return request.mode === "permanent"
    ? `Eliminare definitivamente ${request.model.name}?`
    : `Eliminare ${request.model.name}?`;
}
