import { Button, Dialog } from "@trinacria-cms/trinacria-ui";
import { toStructuredDocument } from "../modules/entries/structured-document.contract.js";
import type { EditorialEntryRecord } from "./editorial-admin.types.js";

export interface EditorRevision {
  id: string;
  revisionNumber: number;
  reason: string;
  snapshotJson?: string;
  createdAt: string;
}

export function EditorialRevisionsDialog({
  current,
  isCreating,
  isLoading,
  isRestoring,
  onClose,
  onCreate,
  onRestore,
  open,
  revisions
}: {
  current: EditorialEntryRecord;
  isCreating: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  onClose: () => void;
  onCreate: () => void;
  onRestore: (revision: EditorRevision) => void;
  open: boolean;
  revisions: readonly EditorRevision[];
}) {
  return (
    <Dialog
      open={open}
      title="Cronologia del contenuto"
      description="Le versioni vengono create quando le richiedi oppure durante i passaggi di workflow."
      closeLabel="Chiudi"
      closeVariant="icon"
      onClose={onClose}
    >
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-[color:var(--color-surface-subtle)] px-3 py-2">
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          Gli autosave non creano versioni.
        </p>
        <Button type="button" size="sm" isLoading={isCreating} onClick={onCreate}>
          Crea versione
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-[color:var(--color-ink-muted)]">Caricamento cronologia…</p>
      ) : null}
      {!isLoading && !revisions.length ? (
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Non sono disponibili revisioni.
        </p>
      ) : null}
      {!isLoading && revisions.length ? (
        <ol className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1">
          {revisions.map((revision) => (
            <li
              key={revision.id}
              className="rounded-lg border border-[color:var(--color-border)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[color:var(--color-ink)]">
                    Revisione {revision.revisionNumber}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                    {revision.reason} · {formatRevisionDate(revision.createdAt)}
                  </p>
                  <p className="mt-2 text-xs text-[color:var(--color-ink-muted)]">
                    {revisionDifference(revision, current)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isRestoring}
                  onClick={() => onRestore(revision)}
                >
                  Ripristina
                </Button>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </Dialog>
  );
}

function formatRevisionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "data non disponibile" : date.toLocaleString("it-IT");
}

function revisionDifference(revision: EditorRevision, current: EditorialEntryRecord) {
  if (!revision.snapshotJson) return "Snapshot disponibile sul server.";
  try {
    const snapshot = JSON.parse(revision.snapshotJson) as EditorialEntryRecord;
    const titleChanged = (snapshot.title ?? "") !== (current.title ?? "");
    const currentBlocks = toStructuredDocument(current.body).blocks.length;
    const snapshotBlocks = toStructuredDocument(snapshot.body).blocks.length;
    if (!titleChanged && currentBlocks === snapshotBlocks)
      return "Stessa struttura della versione corrente.";
    return `${titleChanged ? "Titolo diverso · " : ""}${snapshotBlocks} blocchi nella revisione (ora ${currentBlocks}).`;
  } catch {
    return "Snapshot non leggibile in anteprima.";
  }
}
