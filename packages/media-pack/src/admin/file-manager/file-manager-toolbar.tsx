import { Button, Icon, Input, Select } from "@trinacria-cms/trinacria-ui";
import type { FileManagerViewMode } from "./file-manager.types.js";

export type FileManagerSort = "name" | "updated" | "size";

interface FileManagerToolbarProps {
  detailsVisible: boolean;
  isSaving: boolean;
  onCreateFolder: () => void;
  onCreateCsv: () => void;
  onDetailsVisibleChange: (visible: boolean) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (sort: FileManagerSort) => void;
  onUpload: () => void;
  onViewModeChange: (viewMode: FileManagerViewMode) => void;
  search: string;
  sort: FileManagerSort;
  viewMode: FileManagerViewMode;
}

/** Command strip intentionally mirrors desktop file managers without copying one. */
export function FileManagerToolbar({ detailsVisible, isSaving, onCreateCsv, onCreateFolder, onDetailsVisibleChange, onSearchChange, onSortChange, onUpload, onViewModeChange, search, sort, viewMode }: FileManagerToolbarProps) {
  return <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" disabled={isSaving} onClick={onCreateFolder}><Icon name="folder-plus" className="h-4 w-4" /> Nuova cartella</Button>
      <Button type="button" variant="secondary" disabled={isSaving} onClick={onCreateCsv}><Icon name="file-plus-2" className="h-4 w-4" /> Nuovo CSV</Button>
      <Button type="button" variant="secondary" disabled={isSaving} onClick={onUpload}><Icon name="upload" className="h-4 w-4" /> Carica</Button>
      <div className="h-7 border-l border-[color:var(--color-border)]" />
      <Select aria-label="Ordina elementi" value={sort} onChange={(event) => onSortChange(event.currentTarget.value as FileManagerSort)} className="w-36"><option value="name">Ordina: nome</option><option value="updated">Ordina: modifica</option><option value="size">Ordina: dimensione</option></Select>
      <div className="flex overflow-hidden rounded-md border border-[color:var(--color-border)]">
        <ToolButton active={viewMode === "icons"} label="Vista a icone" icon="grid-2x2" onClick={() => onViewModeChange("icons")} />
        <ToolButton active={viewMode === "list"} label="Vista elenco" icon="list" onClick={() => onViewModeChange("list")} />
      </div>
    </div>
    <div className="flex min-w-0 items-center gap-3">
      <button type="button" aria-pressed={detailsVisible} onClick={() => onDetailsVisibleChange(!detailsVisible)} className={`inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium transition ${detailsVisible ? "bg-[color:var(--color-interactive-soft)] text-[color:var(--color-action-primary-ink)]" : "text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)]"}`}><Icon name="panel-right" className="h-4 w-4" /> Dettagli</button>
      <Input aria-label="Cerca media" placeholder="Cerca" value={search} onChange={(event) => onSearchChange(event.currentTarget.value)} className="w-48" />
    </div>
  </header>;
}

function ToolButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} aria-pressed={active} onClick={onClick} className={`grid h-8 w-8 place-items-center transition ${active ? "bg-[color:var(--color-action-primary-bg)] text-[color:var(--color-action-primary-ink)]" : "text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)]"}`}><Icon name={icon} className="h-4 w-4" /></button>;
}
