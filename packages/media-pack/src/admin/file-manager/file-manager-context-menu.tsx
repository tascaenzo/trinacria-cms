import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from "@trinacria-cms/trinacria-ui";
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
  }

  return (
    <ContextMenu
      x={menu.x}
      y={menu.y}
      onClose={onClose}
      label={menu.asset ? `Azioni per ${menu.asset.displayName}` : "Azioni cartella"}
    >
      {menu.asset ? (
        <>
          <ContextMenuItem icon="eye" title="Apri" onClick={() => command(onOpen)} />
          <ContextMenuItem
            icon="info"
            title="Mostra proprietà"
            onClick={() => command(onProperties)}
          />
          <ContextMenuItem icon="pencil" title="Rinomina" onClick={() => command(onRename)} />
          <ContextMenuItem icon="folder-input" title="Sposta in…" onClick={() => command(onMove)} />
          <ContextMenuSeparator />
          <ContextMenuItem
            tone="danger"
            icon="trash-2"
            title="Sposta nel cestino"
            onClick={() => command(onDelete)}
          />
        </>
      ) : (
        <>
          <ContextMenuItem
            icon="folder-plus"
            title="Nuova cartella"
            onClick={() => command(onCreateFolder)}
          />
          <ContextMenuItem
            icon="file-plus-2"
            title="Nuovo file CSV"
            onClick={() => command(onCreateCsv)}
          />
          <ContextMenuItem
            icon="file-plus-2"
            title="Nuovo file di testo"
            onClick={() => command(onCreateTextFile)}
          />
          <ContextMenuSeparator />
          <ContextMenuItem icon="upload" title="Carica file…" onClick={() => command(onUpload)} />
        </>
      )}
    </ContextMenu>
  );
}
