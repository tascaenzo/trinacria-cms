import { FileManager, type MediaFileManagerSelection } from "@trinacria-cms/media-pack/admin";
import { Button, Icon, IconTile, Input } from "@trinacria-cms/trinacria-ui";
import { useEffect, useState } from "react";
import type { StructuredContentBlock } from "../../modules/entries/structured-document.contract.js";
import type { CmsClient } from "../editorial-admin.types.js";
export function ImageBlockFields({
  apiBaseUrl = "/cms",
  block,
  cms,
  disabled,
  onChange
}: {
  apiBaseUrl?: string;
  block: Extract<StructuredContentBlock, { type: "image" }>;
  cms?: CmsClient;
  disabled: boolean;
  onChange: (block: StructuredContentBlock) => void;
}) {
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(block.data.src);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!block.data.assetId || !cms) {
      setPreviewUrl(block.data.src);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewError(null);
    void cms
      .request<{ data: { url: string } }>({
        method: "POST",
        path: `/v1/media/assets/${encodeURIComponent(block.data.assetId)}/access-url`
      })
      .then((response) => {
        if (!cancelled) setPreviewUrl(resolveMediaUrl(response.data.url, apiBaseUrl));
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl("");
          setPreviewError("Anteprima non disponibile. Puoi scegliere nuovamente il media.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, block.data.assetId, block.data.src, cms]);

  function selectMedia(selection: MediaFileManagerSelection) {
    setPreviewUrl(selection.url);
    setPreviewError(null);
    onChange({
      ...block,
      data: {
        ...block.data,
        src: "",
        assetId: selection.asset.id,
        alt: block.data.alt || selection.asset.displayName
      }
    });
  }

  function clearMedia() {
    setPreviewUrl("");
    setPreviewError(null);
    onChange({
      ...block,
      data: {
        src: "",
        alt: block.data.alt,
        ...(block.data.caption ? { caption: block.data.caption } : {})
      }
    });
  }

  const hasSelectedMedia = Boolean(block.data.assetId || block.data.src);

  return (
    <div className="grid gap-3 py-2">
      {previewUrl ? (
        <figure className="overflow-hidden rounded-md bg-(--color-surface-subtle)">
          <img
            src={previewUrl}
            alt={block.data.alt}
            className="max-h-[34rem] w-full object-contain"
          />
        </figure>
      ) : (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed border-(--color-border-strong) bg-(--color-surface-subtle) px-6 text-center">
          <IconTile icon="image" />
          <p className="mt-3 text-sm font-medium text-(--color-ink)">
            {previewError ?? "Scegli un’immagine dalla libreria media"}
          </p>
          <p className="mt-1 text-xs text-(--color-ink-muted)">
            Il File Manager mostra soltanto file immagine.
          </p>
          {cms ? (
            <Button
              type="button"
              size="sm"
              className="mt-4"
              disabled={disabled}
              onClick={() => setIsFileManagerOpen(true)}
            >
              <Icon name="folder-open" className="h-4 w-4" />
              Apri File Manager
            </Button>
          ) : null}
        </div>
      )}

      {hasSelectedMedia ? (
        <div className="flex flex-wrap items-center gap-2">
          {cms ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => setIsFileManagerOpen(true)}
            >
              <Icon name="folder-open" className="h-4 w-4" />
              Sostituisci
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={clearMedia}>
            Rimuovi
          </Button>
        </div>
      ) : null}

      {!cms ? (
        <Input
          label="URL immagine"
          type="url"
          value={block.data.src}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...block,
              data: {
                src: event.currentTarget.value,
                alt: block.data.alt,
                ...(block.data.caption ? { caption: block.data.caption } : {})
              }
            })
          }
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Testo alternativo"
          value={block.data.alt}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...block, data: { ...block.data, alt: event.currentTarget.value } })
          }
        />
        <Input
          label="Didascalia"
          value={block.data.caption ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const caption = event.currentTarget.value;
            onChange({
              ...block,
              data: caption.trim()
                ? { ...block.data, caption }
                : {
                    src: block.data.src,
                    alt: block.data.alt,
                    ...(block.data.assetId ? { assetId: block.data.assetId } : {})
                  }
            });
          }}
        />
      </div>

      {cms ? (
        <FileManager
          acceptedMimeTypes={["image/*"]}
          apiBaseUrl={apiBaseUrl}
          cms={cms}
          open={isFileManagerOpen}
          presentation="modal"
          selectionMode="single"
          selectLabel="Usa immagine"
          onClose={() => setIsFileManagerOpen(false)}
          onSelect={selectMedia}
        />
      ) : null}
    </div>
  );
}

function resolveMediaUrl(url: string, apiBaseUrl: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return url;
  const normalizedBase = apiBaseUrl.replace(/\/$/, "");
  return `${normalizedBase}${url.startsWith("/") ? url : `/${url}`}`;
}
