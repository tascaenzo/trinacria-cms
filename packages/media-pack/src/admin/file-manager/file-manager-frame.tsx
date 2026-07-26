import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState
} from "react";
import type { FileManagerViewMode, MediaAsset, MediaDirectory } from "./file-manager.types.js";
import { FileManagerBrowser } from "./file-manager-browser.js";
import { FileManagerSidebar } from "./file-manager-sidebar.js";
import { type FileManagerSort, FileManagerToolbar } from "./file-manager-toolbar.js";

interface FileManagerFrameProps {
  assets: readonly MediaAsset[];
  breadcrumbs: readonly MediaDirectory[];
  childDirectories: readonly MediaDirectory[];
  currentDirectory: MediaDirectory | null;
  currentDirectoryId: string | null;
  detailsVisible: boolean;
  directories: readonly MediaDirectory[];
  embedded?: boolean;
  error: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  inspector: ReactNode;
  isLoading: boolean;
  isSaving: boolean;
  message: string | null;
  onAssetContextMenu: (asset: MediaAsset, event: React.MouseEvent<HTMLButtonElement>) => void;
  onBackgroundContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onCreateFolder: () => void;
  onCreateCsv: () => void;
  onDetailsVisibleChange: (visible: boolean) => void;
  onNavigate: (directoryId: string | null) => void;
  onOpenAsset: (asset: MediaAsset) => void;
  onSearchChange: (value: string) => void;
  onSelectAsset: (assetId: string) => void;
  onSortChange: (sort: FileManagerSort) => void;
  onUpload: (files: FileList | null) => void;
  onViewModeChange: (viewMode: FileManagerViewMode) => void;
  search: string;
  resolveAssetPreview: (assetId: string) => Promise<string | null>;
  selectedAssetId: string | null;
  sort: FileManagerSort;
  viewMode: FileManagerViewMode;
}

/** Layout shell: toolbar, tree, workspace and optional details pane. */
export function FileManagerFrame(props: FileManagerFrameProps) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(220);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const frameRef = useRef<HTMLElement>(null);
  const stopResizeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopResizeRef.current?.(), []);

  function startResize(side: "left" | "right", event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    stopResizeRef.current?.();
    const startX = event.clientX;
    const startWidth = side === "left" ? leftPanelWidth : rightPanelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (moveEvent: PointerEvent) => {
      const availableWidth = frameRef.current?.getBoundingClientRect().width ?? 1200;
      if (side === "left") {
        setLeftPanelWidth(
          clamp(
            startWidth + moveEvent.clientX - startX,
            170,
            Math.min(380, availableWidth - rightPanelWidth - 440)
          )
        );
      } else {
        setRightPanelWidth(
          clamp(
            startWidth + startX - moveEvent.clientX,
            260,
            Math.min(520, availableWidth - leftPanelWidth - 440)
          )
        );
      }
    };
    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      stopResizeRef.current = null;
    };
    stopResizeRef.current = stop;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
  }

  function resizeWithKeyboard(side: "left" | "right", event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 16 : -16;
    if (side === "left") setLeftPanelWidth((value) => clamp(value + delta, 170, 380));
    else setRightPanelWidth((value) => clamp(value - delta, 260, 520));
  }

  const columns = props.detailsVisible
    ? `${leftPanelWidth}px 6px minmax(320px, 1fr) 6px ${rightPanelWidth}px`
    : `${leftPanelWidth}px 6px minmax(320px, 1fr)`;

  return (
    <section
      ref={frameRef}
      className={`flex h-full min-h-[36rem] flex-col overflow-hidden bg-[color:var(--color-surface)] ${props.embedded ? "" : "rounded-xl border border-[color:var(--color-border)] shadow-[var(--shadow-sm)]"}`}
    >
      <FileManagerToolbar
        detailsVisible={props.detailsVisible}
        isSaving={props.isSaving}
        onCreateFolder={props.onCreateFolder}
        onCreateCsv={props.onCreateCsv}
        onDetailsVisibleChange={props.onDetailsVisibleChange}
        onSearchChange={props.onSearchChange}
        onSortChange={props.onSortChange}
        onUpload={() => props.fileInputRef.current?.click()}
        onViewModeChange={props.onViewModeChange}
        search={props.search}
        sort={props.sort}
        viewMode={props.viewMode}
      />
      <input
        ref={props.fileInputRef}
        className="hidden"
        type="file"
        multiple
        onChange={(event) => props.onUpload(event.currentTarget.files)}
      />
      <div
        className="grid min-h-0 flex-1 lg:grid-cols-[var(--fm-columns)]"
        style={{ "--fm-columns": columns } as CSSProperties}
      >
        <FileManagerSidebar
          currentDirectoryId={props.currentDirectoryId}
          directories={props.directories}
          onNavigate={props.onNavigate}
        />
        <PanelResizeHandle
          label="Ridimensiona il pannello cartelle"
          minimum={170}
          maximum={380}
          value={leftPanelWidth}
          onDoubleClick={() => setLeftPanelWidth(220)}
          onKeyDown={(event) => resizeWithKeyboard("left", event)}
          onPointerDown={(event) => startResize("left", event)}
        />
        <FileManagerBrowser
          assets={props.assets}
          breadcrumbs={props.breadcrumbs}
          childDirectories={props.childDirectories}
          currentDirectory={props.currentDirectory}
          error={props.error}
          isLoading={props.isLoading}
          message={props.message}
          onNavigate={props.onNavigate}
          onOpenAsset={props.onOpenAsset}
          onAssetContextMenu={props.onAssetContextMenu}
          onBackgroundContextMenu={props.onBackgroundContextMenu}
          onSelectAsset={props.onSelectAsset}
          selectedAssetId={props.selectedAssetId}
          resolveAssetPreview={props.resolveAssetPreview}
          viewMode={props.viewMode}
        />
        {props.detailsVisible ? (
          <>
            <PanelResizeHandle
              label="Ridimensiona il pannello dettagli"
              minimum={260}
              maximum={520}
              value={rightPanelWidth}
              onDoubleClick={() => setRightPanelWidth(300)}
              onKeyDown={(event) => resizeWithKeyboard("right", event)}
              onPointerDown={(event) => startResize("right", event)}
            />
            <aside className="min-h-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-panel)] lg:border-t-0">
              {props.inspector}
            </aside>
          </>
        ) : null}
      </div>
    </section>
  );
}

function PanelResizeHandle({
  label,
  maximum,
  minimum,
  onDoubleClick,
  onKeyDown,
  onPointerDown,
  value
}: {
  label: string;
  maximum: number;
  minimum: number;
  onDoubleClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  value: number;
}) {
  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={minimum}
      aria-valuemax={maximum}
      aria-valuenow={value}
      tabIndex={0}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      className="group relative z-10 hidden cursor-col-resize touch-none bg-[color:var(--color-border)] outline-none transition-colors hover:bg-[color:var(--color-focus)] focus:bg-[color:var(--color-focus)] lg:block"
    >
      <span className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-border-strong)] group-hover:bg-[color:var(--color-surface)]" />
    </div>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}
