import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Icon,
  IconButton
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useRef, useState } from "react";
import type { FileManagerViewMode, MediaAsset, MediaDirectory } from "./file-manager.types.js";

interface FileManagerBrowserProps {
  assets: readonly MediaAsset[];
  breadcrumbs: readonly MediaDirectory[];
  childDirectories: readonly MediaDirectory[];
  currentDirectory: MediaDirectory | null;
  error: string | null;
  isLoading: boolean;
  onNavigate: (directoryId: string | null) => void;
  onOpenAsset: (asset: MediaAsset) => void;
  onAssetContextMenu: (asset: MediaAsset, event: React.MouseEvent<HTMLButtonElement>) => void;
  onBackgroundContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onSelectAsset: (assetId: string) => void;
  selectedAssetId: string | null;
  resolveAssetPreview: (assetId: string) => Promise<string | null>;
  viewMode: FileManagerViewMode;
}

/** Contents pane: compact navigation bar followed by the actual file surface. */
export function FileManagerBrowser({
  assets,
  breadcrumbs,
  childDirectories,
  currentDirectory,
  error,
  isLoading,
  onNavigate,
  onOpenAsset,
  onAssetContextMenu,
  onBackgroundContextMenu,
  onSelectAsset,
  selectedAssetId,
  resolveAssetPreview,
  viewMode
}: FileManagerBrowserProps) {
  const itemCount = assets.length + childDirectories.length;
  return (
    <main
      className="min-w-0 overflow-auto bg-[color:var(--color-surface)]"
      onContextMenu={onBackgroundContextMenu}
    >
      <div className="sticky top-0 z-10 flex h-12 items-center border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4">
        <Breadcrumbs breadcrumbs={breadcrumbs} onNavigate={onNavigate} />
      </div>
      <div className="p-4 sm:p-5">
        {error ? <ErrorBanner className="mb-4" message={error} /> : null}
        {isLoading ? (
          <p className="p-3 text-sm text-[color:var(--color-ink-muted)]">Caricamento media…</p>
        ) : null}
        {!isLoading && itemCount === 0 ? <EmptyFolder currentDirectory={currentDirectory} /> : null}
        {!isLoading && itemCount > 0 ? (
          <FileCollection
            assets={assets}
            directories={childDirectories}
            selectedAssetId={selectedAssetId}
            resolveAssetPreview={resolveAssetPreview}
            viewMode={viewMode}
            onNavigate={onNavigate}
            onOpen={onOpenAsset}
            onSelect={onSelectAsset}
            onContextMenu={onAssetContextMenu}
          />
        ) : null}
      </div>
      <footer className="sticky bottom-0 flex h-8 min-w-0 items-center justify-between gap-4 border-t border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-4 text-xs text-[color:var(--color-ink-subtle)]">
        <span className="shrink-0">
          {itemCount} {itemCount === 1 ? "elemento" : "elementi"}
        </span>
        <span className="min-w-0 truncate" title={currentDirectory?.name ?? "Tutti i media"}>
          {currentDirectory?.name ?? "Tutti i media"}
        </span>
      </footer>
    </main>
  );
}

function Breadcrumbs({
  breadcrumbs,
  onNavigate
}: {
  breadcrumbs: readonly MediaDirectory[];
  onNavigate: (id: string | null) => void;
}) {
  return (
    <nav
      className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden text-sm"
      aria-label="Percorso cartella"
    >
      <IconButton
        icon="house"
        label="Tutti i media"
        size="sm"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={() => onNavigate(null)}
      />
      {breadcrumbs.map((directory) => (
        <span key={directory.id} className="flex min-w-0 items-center gap-1 overflow-hidden">
          <Icon
            name="chevron-right"
            className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-ink-subtle)]"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title={directory.name}
            className="h-auto min-w-0 truncate border-transparent px-1 py-0.5 text-[color:var(--color-ink-muted)] shadow-none"
            onClick={() => onNavigate(directory.id)}
          >
            {directory.name}
          </Button>
        </span>
      ))}
    </nav>
  );
}

function FileCollection({
  assets,
  directories,
  selectedAssetId,
  resolveAssetPreview,
  viewMode,
  onNavigate,
  onOpen,
  onSelect,
  onContextMenu
}: {
  assets: readonly MediaAsset[];
  directories: readonly MediaDirectory[];
  selectedAssetId: string | null;
  resolveAssetPreview: (assetId: string) => Promise<string | null>;
  viewMode: FileManagerViewMode;
  onNavigate: (directoryId: string) => void;
  onOpen: (asset: MediaAsset) => void;
  onSelect: (assetId: string) => void;
  onContextMenu: (asset: MediaAsset, event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      className={
        viewMode === "icons"
          ? "grid min-w-0 grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2"
          : "grid min-w-0 gap-0.5"
      }
    >
      {directories.map((directory) => (
        <Button
          key={directory.id}
          type="button"
          variant="ghost"
          title={directory.name}
          onClick={() => onNavigate(directory.id)}
          className={
            viewMode === "icons"
              ? "grid h-auto min-h-28 min-w-0 content-start justify-items-center gap-2 overflow-hidden border-transparent p-3 text-center shadow-none"
              : "grid h-auto w-full min-w-0 grid-cols-[38px_minmax(0,1fr)_auto] items-center justify-stretch gap-3 overflow-hidden border-transparent px-3 py-2 text-left shadow-none"
          }
        >
          <FolderGlyph large={viewMode === "icons"} />
          <span className="w-full min-w-0 overflow-hidden">
            <span className="block truncate text-sm font-medium text-[color:var(--color-ink)]">
              {directory.name}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[color:var(--color-ink-muted)]">
              Cartella
            </span>
          </span>
          {viewMode === "list" ? (
            <span className="shrink-0">
              <Badge tone={visibilityTone(directory.visibility)}>
                {visibilityLabel(directory.visibility)}
              </Badge>
            </span>
          ) : null}
        </Button>
      ))}
      {assets.map((asset) => (
        <Button
          key={asset.id}
          type="button"
          variant="ghost"
          aria-pressed={selectedAssetId === asset.id}
          title={asset.displayName}
          onClick={() => onSelect(asset.id)}
          onDoubleClick={() => onOpen(asset)}
          onContextMenu={(event) => onContextMenu(asset, event)}
          className={
            viewMode === "icons"
              ? `grid h-auto min-h-28 min-w-0 content-start justify-items-center gap-2 overflow-hidden border-transparent p-3 text-center shadow-none ${selectedAssetId === asset.id ? "bg-[color:var(--color-panel-strong)]" : ""}`
              : `grid h-auto w-full min-w-0 grid-cols-[38px_minmax(0,1fr)_auto] items-center justify-stretch gap-3 overflow-hidden border-transparent px-3 py-2 text-left shadow-none ${selectedAssetId === asset.id ? "bg-[color:var(--color-panel-strong)]" : ""}`
          }
        >
          <MediaGlyph
            asset={asset}
            large={viewMode === "icons"}
            resolvePreview={resolveAssetPreview}
          />
          <span className="w-full min-w-0 overflow-hidden">
            <span className="block truncate text-sm font-medium text-[color:var(--color-ink)]">
              {asset.displayName}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[color:var(--color-ink-muted)]">
              {viewMode === "icons"
                ? formatBytes(asset.byteSize)
                : `${asset.mimeType} · ${formatBytes(asset.byteSize)} · ${formatDate(asset.updatedAt)}`}
            </span>
          </span>
          {viewMode === "list" ? (
            <span className="shrink-0">
              <Badge tone={visibilityTone(asset.visibility)}>
                {visibilityLabel(asset.visibility)}
              </Badge>
            </span>
          ) : null}
        </Button>
      ))}
    </div>
  );
}

function FolderGlyph({ large }: { large: boolean }) {
  return (
    <span
      className={`grid place-items-center text-[color:var(--color-warning-ink)] ${large ? "h-14 w-14" : "h-9 w-9"}`}
    >
      <Icon name="folder" className={large ? "h-10 w-10" : "h-6 w-6"} />
    </span>
  );
}
function MediaGlyph({
  asset,
  large,
  resolvePreview
}: {
  asset: MediaAsset;
  large: boolean;
  resolvePreview: (assetId: string) => Promise<string | null>;
}) {
  const isImage = asset.mimeType.startsWith("image/");
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded border border-[color:var(--color-border)] bg-[color:var(--color-panel)] text-[color:var(--color-ink-muted)] ${large ? "h-14 w-14" : "h-9 w-9"}`}
    >
      {isImage ? (
        <LazyImageThumbnail asset={asset} resolvePreview={resolvePreview} />
      ) : (
        <Icon
          name={
            asset.mimeType === "application/pdf" || asset.mimeType.startsWith("text/")
              ? "file-text"
              : "file"
          }
          className={large ? "h-7 w-7" : "h-5 w-5"}
        />
      )}
    </span>
  );
}
function LazyImageThumbnail({
  asset,
  resolvePreview
}: {
  asset: MediaAsset;
  resolvePreview: (assetId: string) => Promise<string | null>;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const load = () => {
      void resolvePreview(asset.id).then((nextUrl) => {
        if (!cancelled) setUrl(nextUrl);
      });
    };
    if (!("IntersectionObserver" in window)) load();
    else {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            load();
          }
        },
        { rootMargin: "120px" }
      );
      observer.observe(host);
      return () => {
        cancelled = true;
        observer.disconnect();
      };
    }
    return () => {
      cancelled = true;
    };
  }, [asset.id, resolvePreview]);
  return (
    <span ref={hostRef} className="grid h-full w-full place-items-center">
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Icon name="image" className="h-5 w-5" />
      )}
    </span>
  );
}
function EmptyFolder({ currentDirectory }: { currentDirectory: MediaDirectory | null }) {
  return (
    <EmptyState
      className="min-h-72 place-items-center text-center"
      title={currentDirectory ? "Cartella vuota" : "Nessun media"}
      text="Crea una cartella o carica un file dalla barra degli strumenti."
    />
  );
}
function formatBytes(value: number) {
  if (value < 1_000_000) return `${Math.max(1, Math.round(value / 1_000))} KB`;
  return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} MB`;
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(date);
}
function visibilityLabel(value: MediaAsset["visibility"]) {
  return value === "public" ? "Pubblico" : value === "restricted" ? "Ristretto" : "Privato";
}
function visibilityTone(value: MediaAsset["visibility"]): "success" | "warning" | "neutral" {
  return value === "public" ? "success" : value === "restricted" ? "warning" : "neutral";
}
