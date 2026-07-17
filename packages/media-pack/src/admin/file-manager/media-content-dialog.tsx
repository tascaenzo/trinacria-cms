import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, Icon } from "@trinacria-cms/trinacria-ui";
import type { createCmsSdkClient } from "@trinacria-cms/sdk";
import { CodeEditor } from "./code-editor.js";
import { ConfirmationDialog } from "./file-manager-dialogs.js";
import { CsvEditor, parseCsv, serializeCsv, type CsvDocument } from "./csv-editor.js";
import type { MediaAsset } from "./file-manager.types.js";

type CmsClient = ReturnType<typeof createCmsSdkClient>;
type CsvView = "table" | "source";
const MAX_EDITABLE_TEXT_BYTES = 5_000_000;

interface MediaContentDialogProps {
  apiBaseUrl: string;
  asset: MediaAsset | null;
  cms: CmsClient;
  onClose: () => void;
  onSave: (asset: MediaAsset, content: string) => Promise<boolean>;
}

export function MediaContentDialog({
  apiBaseUrl,
  asset,
  cms,
  onClose,
  onSave
}: MediaContentDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [csv, setCsv] = useState<CsvDocument>({ delimiter: ",", rows: [[""]] });
  const [csvView, setCsvView] = useState<CsvView>("table");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const isCsv = asset ? isCsvAsset(asset) : false;
  const isText = asset ? isTextAsset(asset) : false;
  const canEdit = Boolean(asset && (isCsv || isText) && asset.byteSize <= MAX_EDITABLE_TEXT_BYTES);
  const saveContent = useMemo(
    () => (isCsv && csvView === "table" ? serializeCsv(csv) : text),
    [csv, csvView, isCsv, text]
  );

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    setUrl(null);
    setText("");
    setCsv({ delimiter: ",", rows: [[""]] });
    setCsvView("table");
    setIsDirty(false);
    setError(null);
    setZoom(1);
    setIsDiscardOpen(false);
    setIsLoading(true);
    void cms
      .request<{ data: { url: string } }>({
        method: "POST",
        path: `/v1/media/assets/${encodeURIComponent(asset.id)}/access-url`
      })
      .then(async (response) => {
        const nextUrl = resolveMediaUrl(response.data.url, apiBaseUrl);
        if (cancelled) return;
        setUrl(nextUrl);
        if (
          (isTextAsset(asset) || isCsvAsset(asset)) &&
          asset.byteSize <= MAX_EDITABLE_TEXT_BYTES
        ) {
          const contentResponse = await fetch(nextUrl, { credentials: "same-origin" });
          if (!contentResponse.ok)
            throw new Error(`Lettura del file non riuscita (${contentResponse.status}).`);
          const content = await contentResponse.text();
          if (cancelled) return;
          setText(content);
          if (isCsvAsset(asset)) setCsv(parseCsv(content));
        }
      })
      .catch((currentError) => {
        if (!cancelled) setError(toDisplayError(currentError));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, asset?.id, cms]);

  function close() {
    if (isDirty) setIsDiscardOpen(true);
    else onClose();
  }

  async function save() {
    if (!asset || !canEdit) return;
    try {
      setIsSaving(true);
      setError(null);
      if (await onSave(asset, saveContent)) setIsDirty(false);
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  function showCsvView(view: CsvView) {
    if (view === csvView) return;
    if (view === "source") setText(serializeCsv(csv));
    else setCsv(parseCsv(text));
    setCsvView(view);
  }

  const footer = (
    <>
      <span className="mr-auto text-xs text-[color:var(--color-ink-subtle)]">
        {asset ? `${asset.mimeType} · ${formatBytes(asset.byteSize)}` : ""}
      </span>
      <Button type="button" variant="secondary" onClick={close}>
        Chiudi
      </Button>
      {canEdit ? (
        <Button
          type="button"
          disabled={!isDirty || isSaving || isLoading}
          onClick={() => void save()}
        >
          {isSaving ? "Salvataggio…" : "Salva contenuto"}
        </Button>
      ) : null}
    </>
  );

  return (
    <>
      <Dialog
        open={asset !== null}
        title={asset?.displayName ?? "Visualizzatore media"}
        description={asset?.originalFilename}
        closeLabel="Chiudi"
        closeVariant="icon"
        width="fullscreen"
        onClose={close}
        footer={footer}
      >
        <div className="flex h-full min-h-0 flex-col bg-[color:var(--color-panel)]">
          {isCsv && canEdit ? (
            <div className="flex shrink-0 items-center gap-1 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-2">
              <ViewButton
                active={csvView === "table"}
                label="Tabella"
                onClick={() => showCsvView("table")}
              />
              <ViewButton
                active={csvView === "source"}
                label="Sorgente CSV"
                onClick={() => showCsvView("source")}
              />
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="m-4 rounded-md border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-ink)]"
            >
              {error}
            </div>
          ) : null}
          <div className="min-h-0 flex-1">
            {isLoading ? (
              <LoadingState />
            ) : asset ? (
              <ContentSurface
                asset={asset}
                canEdit={canEdit}
                csv={csv}
                csvView={csvView}
                onCsvChange={(next) => {
                  setCsv(next);
                  setIsDirty(true);
                }}
                onTextChange={(next) => {
                  setText(next);
                  setIsDirty(true);
                }}
                onZoomChange={setZoom}
                text={text}
                url={url}
                zoom={zoom}
              />
            ) : null}
          </div>
        </div>
      </Dialog>
      <ConfirmationDialog
        open={isDiscardOpen}
        title="Ignorare le modifiche?"
        description="Il contenuto modificato non è ancora stato salvato."
        confirmLabel="Ignora modifiche"
        isSaving={false}
        onClose={() => setIsDiscardOpen(false)}
        onConfirm={() => {
          setIsDiscardOpen(false);
          setIsDirty(false);
          onClose();
        }}
      />
    </>
  );
}

function ContentSurface({
  asset,
  canEdit,
  csv,
  csvView,
  onCsvChange,
  onTextChange,
  onZoomChange,
  text,
  url,
  zoom
}: {
  asset: MediaAsset;
  canEdit: boolean;
  csv: CsvDocument;
  csvView: CsvView;
  onCsvChange: (value: CsvDocument) => void;
  onTextChange: (value: string) => void;
  onZoomChange: (value: number) => void;
  text: string;
  url: string | null;
  zoom: number;
}) {
  if (isCsvAsset(asset) && canEdit) {
    return csvView === "table" ? (
      <CsvEditor document={csv} onChange={onCsvChange} />
    ) : (
      <CodeEditor
        ariaLabel={`Sorgente CSV di ${asset.displayName}`}
        value={text}
        onChange={onTextChange}
      />
    );
  }
  if (isTextAsset(asset) && canEdit)
    return (
      <CodeEditor
        ariaLabel={`Contenuto di ${asset.displayName}`}
        value={text}
        onChange={onTextChange}
      />
    );
  if (asset.mimeType.startsWith("image/") && url)
    return <ImageViewer asset={asset} url={url} zoom={zoom} onZoomChange={onZoomChange} />;
  if (asset.mimeType === "application/pdf" && url)
    return (
      <iframe
        src={url}
        title={`Anteprima di ${asset.displayName}`}
        className="h-full w-full border-0 bg-white"
      />
    );
  if ((isTextAsset(asset) || isCsvAsset(asset)) && !canEdit)
    return (
      <UnsupportedState
        message={`Il file supera il limite di ${formatBytes(MAX_EDITABLE_TEXT_BYTES)} previsto per l’editor integrato.`}
        url={url}
      />
    );
  return (
    <UnsupportedState
      message="Questo formato non dispone di un visualizzatore integrato."
      url={url}
    />
  );
}

function ImageViewer({
  asset,
  onZoomChange,
  url,
  zoom
}: {
  asset: MediaAsset;
  onZoomChange: (value: number) => void;
  url: string;
  zoom: number;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-2">
        <span className="text-xs text-[color:var(--color-ink-muted)]">
          {asset.width && asset.height
            ? `${asset.width} × ${asset.height} px`
            : "Anteprima originale"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Riduci zoom"
            className="grid h-8 w-8 place-items-center rounded hover:bg-[color:var(--color-interactive-hover)]"
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
          >
            <Icon name="minus" className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="min-w-16 rounded px-2 py-1 text-xs hover:bg-[color:var(--color-interactive-hover)]"
            onClick={() => onZoomChange(1)}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="Aumenta zoom"
            className="grid h-8 w-8 place-items-center rounded hover:bg-[color:var(--color-interactive-hover)]"
            onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-[linear-gradient(45deg,var(--color-border)_25%,transparent_25%),linear-gradient(-45deg,var(--color-border)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--color-border)_75%),linear-gradient(-45deg,transparent_75%,var(--color-border)_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px] p-8">
        <img
          src={url}
          alt={asset.displayName}
          style={{ transform: `scale(${zoom})` }}
          className="max-h-full max-w-full origin-center object-contain shadow-xl transition-transform"
        />
      </div>
    </div>
  );
}

function ViewButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-[color:var(--color-interactive-soft)] text-[color:var(--color-action-primary-ink)]" : "text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)]"}`}
    >
      {label}
    </button>
  );
}
function LoadingState() {
  return (
    <div className="grid h-full place-items-center text-sm text-[color:var(--color-ink-muted)]">
      Caricamento contenuto…
    </div>
  );
}
function UnsupportedState({ message, url }: { message: string; url: string | null }) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <Icon name="file" className="mx-auto h-10 w-10 text-[color:var(--color-ink-subtle)]" />
        <p className="mt-3 text-sm text-[color:var(--color-ink-muted)]">{message}</p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-sm font-medium text-[color:var(--color-action-primary-ink)] hover:underline"
          >
            Apri il file
          </a>
        ) : null}
      </div>
    </div>
  );
}
function isCsvAsset(asset: MediaAsset) {
  return (
    asset.mimeType === "text/csv" ||
    asset.mimeType === "application/csv" ||
    asset.originalFilename.toLowerCase().endsWith(".csv")
  );
}
function isTextAsset(asset: MediaAsset) {
  return asset.mimeType.startsWith("text/") && !isCsvAsset(asset);
}
function resolveMediaUrl(url: string, apiBaseUrl: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return url;
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}
function formatBytes(value: number) {
  if (value < 1_000_000) return `${Math.max(0, Math.round(value / 1_000))} KB`;
  return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} MB`;
}
function toDisplayError(error: unknown) {
  return error instanceof Error ? error.message : "Operazione sul contenuto non riuscita.";
}
