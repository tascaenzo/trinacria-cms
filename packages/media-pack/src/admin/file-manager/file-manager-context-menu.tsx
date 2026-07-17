import { Icon } from "@trinacria-cms/trinacria-ui";
import type { MediaAsset } from "./file-manager.types.js";

export interface FileManagerContextMenuState {
  x: number;
  y: number;
  asset?: MediaAsset;
}

interface FileManagerContextMenuProps {
  menu: FileManagerContextMenuState;
  onClose: () => void;
  onCreateFolder: () => void;
  onCreateCsv: () => void;
  onCreateTextFile: () => void;
  onDelete: () => void;
  onMove: () => void;
  onOpen: () => void;
  onProperties: () => void;
  onRename: () => void;
  onUpload: () => void;
}

/** Native-like contextual actions; the coordinator decides what every command does. */
export function FileManagerContextMenu({
  menu,
  onClose,
  onCreateFolder,
  onCreateCsv,
  onCreateTextFile,
  onDelete,
  onMove,
  onOpen,
  onProperties,
  onRename,
  onUpload
}: FileManagerContextMenuProps) {
  function command(action: () => void) {
    action();
    onClose();
  }

  return (
    <div
      role="menu"
      aria-label={menu.asset ? `Azioni per ${menu.asset.displayName}` : "Azioni cartella"}
      style={{ left: menu.x, top: menu.y }}
      className="fixed z-[70] w-56 overflow-hidden rounded-xl border border-black/10 bg-white/95 p-1 shadow-[0_16px_45px_rgba(15,23,42,0.24)] backdrop-blur"
      onContextMenu={(event) => event.preventDefault()}
    >
      {menu.asset ? (
        <>
          <ContextMenuItem icon="eye" label="Apri" onClick={() => command(onOpen)} />
          <ContextMenuItem icon="info" label="Mostra proprietà" onClick={() => command(onProperties)} />
          <ContextMenuItem icon="pencil" label="Rinomina" onClick={() => command(onRename)} />
          <ContextMenuItem icon="folder-input" label="Sposta in…" onClick={() => command(onMove)} />
          <div className="my-1 border-t border-black/10" />
          <ContextMenuItem danger icon="trash-2" label="Sposta nel cestino" onClick={() => command(onDelete)} />
        </>
      ) : (
        <>
          <ContextMenuItem icon="folder-plus" label="Nuova cartella" onClick={() => command(onCreateFolder)} />
          <ContextMenuItem icon="file-plus-2" label="Nuovo file CSV" onClick={() => command(onCreateCsv)} />
          <ContextMenuItem icon="file-plus-2" label="Nuovo file di testo" onClick={() => command(onCreateTextFile)} />
          <div className="my-1 border-t border-black/10" />
          <ContextMenuItem icon="upload" label="Carica file…" onClick={() => command(onUpload)} />
        </>
      )}
    </div>
  );
}

function ContextMenuItem({ danger = false, icon, label, onClick }: { danger?: boolean; icon: string; label: string; onClick: () => void }) {
  return <button type="button" role="menuitem" onClick={onClick} className={`flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition ${danger ? "text-red-700 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"}`}><Icon name={icon} className="h-4 w-4" /><span>{label}</span></button>;
}
