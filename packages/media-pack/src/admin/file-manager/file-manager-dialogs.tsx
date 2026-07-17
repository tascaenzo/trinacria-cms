import { useEffect, useState } from "react";
import { Button, Dialog, Input, Select, Textarea } from "@trinacria-cms/trinacria-ui";
import type { MediaAsset, MediaDirectory } from "./file-manager.types.js";

interface TextFileDialogProps {
  content: string;
  filename: string;
  isSaving: boolean;
  onClose: () => void;
  onContentChange: (value: string) => void;
  onCreate: () => void;
  onFilenameChange: (value: string) => void;
  open: boolean;
}

export function TextFileDialog({ content, filename, isSaving, onClose, onContentChange, onCreate, onFilenameChange, open }: TextFileDialogProps) {
  return <Dialog open={open} title="Nuovo file di testo" description="Il file verrà creato nella cartella aperta." closeLabel="Chiudi" closeVariant="icon" onClose={onClose} footer={<><Button type="button" variant="secondary" onClick={onClose}>Annulla</Button><Button type="button" disabled={isSaving || !filename.trim()} onClick={onCreate}>Crea file</Button></>}><div className="grid gap-4"><Input label="Nome file" value={filename} readOnly={isSaving} onChange={(event) => onFilenameChange(event.currentTarget.value)} /><Textarea label="Contenuto" rows={12} value={content} readOnly={isSaving} onChange={(event) => onContentChange(event.currentTarget.value)} /></div></Dialog>;
}

export type CsvDelimiter = "," | ";" | "\t";

interface CreateCsvDialogProps {
  columns: string;
  delimiter: CsvDelimiter;
  error?: string | null;
  filename: string;
  isSaving: boolean;
  onClose: () => void;
  onColumnsChange: (value: string) => void;
  onCreate: () => void;
  onDelimiterChange: (value: CsvDelimiter) => void;
  onFilenameChange: (value: string) => void;
  open: boolean;
}

export function CreateCsvDialog({ columns, delimiter, error, filename, isSaving, onClose, onColumnsChange, onCreate, onDelimiterChange, onFilenameChange, open }: CreateCsvDialogProps) {
  const columnCount = columns.split(/\r?\n/).filter((column) => column.trim()).length;
  return <Dialog open={open} title="Nuovo file CSV" description="Definisci il file e le intestazioni iniziali. Potrai aggiungere righe e colonne nell’editor." closeLabel="Chiudi" closeVariant="icon" onClose={onClose} footer={<><Button type="button" variant="secondary" onClick={onClose}>Annulla</Button><Button type="button" disabled={isSaving || !filename.trim() || columnCount === 0} onClick={onCreate}>{isSaving ? "Creazione…" : "Crea e apri"}</Button></>}><div className="grid gap-4">{error ? <p role="alert" className="rounded-md border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-ink)]">{error}</p> : null}<Input label="Nome file" hint="L’estensione .csv viene aggiunta automaticamente." value={filename} readOnly={isSaving} onChange={(event) => onFilenameChange(event.currentTarget.value)} /><Select label="Separatore" value={delimiter} disabled={isSaving} onChange={(event) => onDelimiterChange(event.currentTarget.value as CsvDelimiter)}><option value=",">Virgola (,)</option><option value=";">Punto e virgola (;)</option><option value={"\t"}>Tabulazione</option></Select><Textarea label="Intestazioni" hint="Inserisci una colonna per riga." rows={7} value={columns} readOnly={isSaving} onChange={(event) => onColumnsChange(event.currentTarget.value)} /></div></Dialog>;
}

interface CreateFolderDialogProps {
  isSaving: boolean;
  name: string;
  onClose: () => void;
  onCreate: () => void;
  onNameChange: (value: string) => void;
  open: boolean;
  parentName?: string;
}

export function CreateFolderDialog({ isSaving, name, onClose, onCreate, onNameChange, open, parentName }: CreateFolderDialogProps) {
  return <Dialog open={open} title="Nuova cartella" description={parentName ? `Crea una cartella dentro “${parentName}”.` : "Crea una cartella nella radice dei media."} closeLabel="Chiudi" closeVariant="icon" onClose={onClose} footer={<><Button type="button" variant="secondary" onClick={onClose}>Annulla</Button><Button type="button" disabled={isSaving || !name.trim()} onClick={onCreate}>Crea cartella</Button></>}><Input label="Nome cartella" placeholder="Inserisci il nome" value={name} readOnly={isSaving} onChange={(event) => onNameChange(event.currentTarget.value)} /></Dialog>;
}

interface RenameAssetDialogProps {
  asset: MediaAsset | null;
  isSaving: boolean;
  name: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onRename: () => void;
}

export function RenameAssetDialog({ asset, isSaving, name, onClose, onNameChange, onRename }: RenameAssetDialogProps) {
  return <Dialog open={asset !== null} title="Rinomina media" description={asset?.originalFilename} closeLabel="Chiudi" closeVariant="icon" onClose={onClose} footer={<><Button type="button" variant="secondary" onClick={onClose}>Annulla</Button><Button type="button" disabled={isSaving || !name.trim() || name.trim() === asset?.displayName} onClick={onRename}>Rinomina</Button></>}><Input label="Nuovo nome" value={name} readOnly={isSaving} onChange={(event) => onNameChange(event.currentTarget.value)} /></Dialog>;
}

interface ConfirmationDialogProps {
  confirmLabel: string;
  description: string;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}

export function ConfirmationDialog({ confirmLabel, description, isSaving, onClose, onConfirm, open, title }: ConfirmationDialogProps) {
  return <Dialog open={open} title={title} description={description} closeLabel="Chiudi" closeVariant="icon" onClose={onClose} footer={<><Button type="button" variant="secondary" onClick={onClose}>Annulla</Button><Button type="button" className="bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)] hover:brightness-95" disabled={isSaving} onClick={onConfirm}>{confirmLabel}</Button></>}><p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">Questa operazione non può essere annullata.</p></Dialog>;
}

interface MoveAssetDialogProps {
  asset: MediaAsset | null;
  directories: readonly MediaDirectory[];
  isSaving: boolean;
  onClose: () => void;
  onMove: (directoryId: string | null) => void;
}

export function MoveAssetDialog({ asset, directories, isSaving, onClose, onMove }: MoveAssetDialogProps) {
  const [destinationId, setDestinationId] = useState("");

  useEffect(() => setDestinationId(asset?.directoryId ?? ""), [asset?.id]);

  return <Dialog open={asset !== null} title="Sposta elemento" description={asset ? `Scegli la nuova posizione per “${asset.displayName}”.` : undefined} closeLabel="Chiudi" closeVariant="icon" onClose={onClose} footer={<><Button type="button" variant="secondary" onClick={onClose}>Annulla</Button><Button type="button" disabled={isSaving} onClick={() => onMove(destinationId || null)}>Sposta</Button></>}><Select label="Destinazione" value={destinationId} disabled={isSaving} onChange={(event) => setDestinationId(event.currentTarget.value)}><option value="">Tutti i media</option>{directories.map((directory) => <option key={directory.id} value={directory.id}>{directory.name}</option>)}</Select></Dialog>;
}
