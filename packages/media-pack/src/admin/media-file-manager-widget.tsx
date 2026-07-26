import type { createCmsSdkClient } from "@trinacria-cms/sdk";
import { Button, Icon } from "@trinacria-cms/trinacria-ui";
import { useCallback, useEffect, useMemo, useState } from "react";

type CmsClient = ReturnType<typeof createCmsSdkClient>;

interface ApiEnvelope<T> {
  data: T;
}

interface MediaWidgetAsset {
  id: string;
  displayName: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  status: string;
  visibility: "private" | "restricted" | "public";
  updatedAt: string;
}

export interface MediaFileManagerWidgetContext {
  cms: CmsClient;
  locale: string;
  navigateToRoute?: (routeId: string) => void;
  routes: readonly { id: string }[];
}

const PAGE_LIMIT = 100;
const RECENT_ASSET_LIMIT = 5;

/** Dashboard overview for the media library with a direct file-manager action. */
export function MediaFileManagerWidget({
  cms,
  locale,
  navigateToRoute,
  routes
}: MediaFileManagerWidgetContext) {
  const [assets, setAssets] = useState<readonly MediaWidgetAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canOpenFileManager = routes.some((route) => route.id === "media-assets");

  const loadAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await cms.request<ApiEnvelope<readonly MediaWidgetAsset[]>>({
        method: "GET",
        path: "/v1/media/assets",
        query: { limit: PAGE_LIMIT, offset: 0 }
      });
      setAssets(response.data);
    } catch (currentError) {
      setAssets([]);
      setError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }, [cms]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const activeAssets = useMemo(
    () => assets.filter((asset) => asset.status !== "deleted"),
    [assets]
  );
  const recentAssets = activeAssets.slice(0, RECENT_ASSET_LIMIT);
  const usedBytes = activeAssets.reduce((total, asset) => total + asset.byteSize, 0);
  const sharedAssets = activeAssets.filter((asset) => asset.visibility !== "private").length;
  const totalLabel =
    assets.length === PAGE_LIMIT ? `${activeAssets.length}+` : String(activeAssets.length);

  return (
    <article className="flex h-full min-h-[290px] min-w-0 flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-[var(--shadow-sm)]">
      <header className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border)] px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
            Libreria
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-[color:var(--color-ink)]">
            File manager
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Aggiorna media"
            title="Aggiorna"
            disabled={isLoading}
            onClick={() => void loadAssets()}
          >
            <Icon name="refresh-cw" className={isLoading ? "animate-spin" : undefined} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canOpenFileManager}
            onClick={() => navigateToRoute?.("media-assets")}
          >
            Apri
            <Icon name="arrow-right" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-3 divide-x divide-[color:var(--color-border)] border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)]">
        <MediaMetric label="Media" value={isLoading ? "…" : totalLabel} />
        <MediaMetric label="Spazio" value={isLoading ? "…" : formatBytes(usedBytes)} />
        <MediaMetric label="Condivisi" value={isLoading ? "…" : String(sharedAssets)} />
      </div>

      <div className="min-h-0 flex-1 px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--color-ink-subtle)]">
            Modificati di recente
          </p>
          {assets.length === PAGE_LIMIT ? (
            <span className="text-[11px] text-[color:var(--color-ink-subtle)]">Primi 100</span>
          ) : null}
        </div>

        {error ? (
          <div className="grid min-h-28 place-items-center rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-4 text-center">
            <div>
              <p className="text-sm font-medium text-[color:var(--color-danger-ink)]">{error}</p>
              <Button
                className="mt-2"
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void loadAssets()}
              >
                Riprova
              </Button>
            </div>
          </div>
        ) : recentAssets.length > 0 ? (
          <ul className="grid gap-1" aria-label="Media modificati di recente">
            {recentAssets.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  disabled={!canOpenFileManager}
                  className="grid w-full min-w-0 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[color:var(--color-surface-subtle)] disabled:cursor-default disabled:hover:bg-transparent"
                  onClick={() => navigateToRoute?.("media-assets")}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-muted)]">
                    <Icon name={getAssetIcon(asset.mimeType)} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[color:var(--color-ink)]">
                      {asset.displayName}
                    </span>
                    <span className="block truncate text-xs text-[color:var(--color-ink-subtle)]">
                      {formatBytes(asset.byteSize)} · {formatUpdatedAt(asset.updatedAt, locale)}
                    </span>
                  </span>
                  <VisibilityDot visibility={asset.visibility} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid min-h-28 place-items-center rounded-lg border border-dashed border-[color:var(--color-border-strong)] p-4 text-center">
            <div>
              <Icon name="folder-open" className="mx-auto text-[color:var(--color-ink-subtle)]" />
              <p className="mt-2 text-sm font-medium text-[color:var(--color-ink)]">
                {isLoading ? "Caricamento media…" : "La libreria è vuota"}
              </p>
              {!isLoading && canOpenFileManager ? (
                <Button
                  className="mt-2"
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigateToRoute?.("media-assets")}
                >
                  Apri file manager
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function MediaMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="truncate text-[11px] text-[color:var(--color-ink-subtle)]">{label}</p>
      <p className="mt-0.5 truncate text-lg font-semibold tabular-nums text-[color:var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

function VisibilityDot({ visibility }: { visibility: MediaWidgetAsset["visibility"] }) {
  const label =
    visibility === "public" ? "Pubblico" : visibility === "restricted" ? "Limitato" : "Privato";
  const tone =
    visibility === "public"
      ? "bg-emerald-500"
      : visibility === "restricted"
        ? "bg-amber-500"
        : "bg-slate-400";
  return <span className={`h-2 w-2 rounded-full ${tone}`} title={label} aria-label={label} />;
}

function getAssetIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "text/csv") return "file-json";
  if (mimeType.startsWith("text/")) return "file-text";
  if (mimeType === "application/pdf") return "file-text";
  return "file";
}

function formatBytes(bytes: number) {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(bytes < 10_000 ? 1 : 0)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}

function formatUpdatedAt(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data non disponibile";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(date);
}

function toDisplayError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Impossibile caricare la libreria media.";
}
