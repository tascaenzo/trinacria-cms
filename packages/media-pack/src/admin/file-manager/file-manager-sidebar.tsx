import { Icon } from "@trinacria-cms/trinacria-ui";
import type { MediaDirectory } from "./file-manager.types.js";

interface FileManagerSidebarProps {
  currentDirectoryId: string | null;
  directories: readonly MediaDirectory[];
  onNavigate: (directoryId: string | null) => void;
}

/** Folder tree stays purely navigational, like a desktop file manager sidebar. */
export function FileManagerSidebar({
  currentDirectoryId,
  directories,
  onNavigate
}: FileManagerSidebarProps) {
  return (
    <aside className="min-h-0 overflow-auto border-b border-[color:var(--color-border)] bg-[color:var(--color-panel)] lg:border-b-0 lg:border-r">
      <div className="border-b border-[color:var(--color-border)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
          Cartelle
        </p>
      </div>
      <nav className="grid gap-0.5 p-2" aria-label="Cartelle media">
        <DirectoryRow
          active={currentDirectoryId === null}
          label="Tutti i media"
          icon="house"
          onClick={() => onNavigate(null)}
        />
        <DirectoryTree
          activeDirectoryId={currentDirectoryId}
          directories={directories}
          onNavigate={onNavigate}
        />
      </nav>
    </aside>
  );
}

function DirectoryTree({
  activeDirectoryId,
  directories,
  onNavigate,
  parentId,
  depth = 0
}: {
  activeDirectoryId: string | null;
  directories: readonly MediaDirectory[];
  onNavigate: (directoryId: string) => void;
  parentId?: string;
  depth?: number;
}) {
  return (
    <>
      {directories
        .filter((directory) => directory.parentId === parentId)
        .map((directory) => (
          <div key={directory.id}>
            <DirectoryRow
              active={directory.id === activeDirectoryId}
              depth={depth}
              label={directory.name}
              icon="folder"
              onClick={() => onNavigate(directory.id)}
            />
            {directories.some((candidate) => candidate.parentId === directory.id) ? (
              <DirectoryTree
                activeDirectoryId={activeDirectoryId}
                directories={directories}
                onNavigate={onNavigate}
                parentId={directory.id}
                depth={depth + 1}
              />
            ) : null}
          </div>
        ))}
    </>
  );
}

function DirectoryRow({
  active,
  depth = 0,
  icon,
  label,
  onClick
}: {
  active: boolean;
  depth?: number;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ paddingLeft: `${10 + depth * 16}px` }}
      className={`flex h-8 w-full items-center gap-2 rounded-md pr-2 text-left text-sm transition ${active ? "bg-[color:var(--color-interactive-soft)] font-medium text-[color:var(--color-ink)]" : "text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)]"}`}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0 text-[color:var(--color-ink-subtle)]" />
      <span className="truncate">{label}</span>
    </button>
  );
}
