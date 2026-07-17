import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Checkbox, Input } from "@trinacria-cms/trinacria-ui";
import type { createCmsSdkClient } from "@trinacria-cms/sdk";

type CmsClient = ReturnType<typeof createCmsSdkClient>;

const SETTINGS = {
  maxFileBytes: "media-pack:limits:max_file_bytes",
  allowedMimeTypes: "media-pack:limits:allowed_mime_types",
  maxImagePixels: "media-pack:limits:max_image_pixels"
} as const;

const MIME_TYPE_GROUPS = [
  {
    label: "Immagini",
    items: [
      ["image/jpeg", "JPEG"],
      ["image/png", "PNG"],
      ["image/webp", "WebP"],
      ["image/gif", "GIF"],
      ["image/avif", "AVIF"],
      ["image/svg+xml", "SVG"]
    ]
  },
  {
    label: "Documenti",
    items: [
      ["application/pdf", "PDF"],
      ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Word (.docx)"],
      ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Excel (.xlsx)"],
      [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "PowerPoint (.pptx)"
      ],
      ["text/plain", "Testo (.txt)"],
      ["text/csv", "CSV (.csv)"]
    ]
  },
  {
    label: "Audio e video",
    items: [
      ["video/mp4", "Video MP4"],
      ["video/webm", "Video WebM"],
      ["audio/mpeg", "Audio MP3"],
      ["audio/wav", "Audio WAV"]
    ]
  }
] as const;

const KNOWN_MIME_TYPES: ReadonlySet<string> = new Set(
  MIME_TYPE_GROUPS.flatMap((group) => group.items.map(([type]) => type))
);
const DEFAULT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv"
];

export interface MediaUploadPolicySettingsContext {
  cms: CmsClient;
  t: (key: string, fallback?: string) => string;
}

export function MediaUploadPolicySettings({ cms, t }: MediaUploadPolicySettingsContext) {
  const [maxFileMegabytes, setMaxFileMegabytes] = useState("25");
  const [maxImageMegapixels, setMaxImageMegapixels] = useState("40");
  const [mimeTypes, setMimeTypes] = useState<readonly string[]>(DEFAULT_MIME_TYPES);
  const [customMimeType, setCustomMimeType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const customMimeTypes = useMemo(
    () => mimeTypes.filter((mimeType) => !KNOWN_MIME_TYPES.has(mimeType)),
    [mimeTypes]
  );

  useEffect(() => {
    void loadPolicy();
  }, []);

  async function loadPolicy() {
    try {
      setIsLoading(true);
      setError(null);
      const [maxBytes, maxPixels, configuredMimeTypes] = await Promise.all([
        readNumber(SETTINGS.maxFileBytes, 25_000_000),
        readNumber(SETTINGS.maxImagePixels, 40_000_000),
        readMimeTypes()
      ]);
      setMaxFileMegabytes(formatMegabytes(maxBytes));
      setMaxImageMegapixels(formatMegapixels(maxPixels));
      setMimeTypes(configuredMimeTypes.length ? configuredMimeTypes : DEFAULT_MIME_TYPES);
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }

  async function readNumber(key: string, fallback: number): Promise<number> {
    try {
      const response = await cms.settings.getSettingValueByKey({ path: { key } });
      return typeof response.data?.value === "number" ? response.data.value : fallback;
    } catch {
      return fallback;
    }
  }

  async function readMimeTypes(): Promise<readonly string[]> {
    try {
      const response = await cms.settings.getSettingValueByKey({
        path: { key: SETTINGS.allowedMimeTypes }
      });
      return Array.isArray(response.data?.value)
        ? response.data.value.filter((value): value is string => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  }

  function toggleMimeType(mimeType: string) {
    setMimeTypes((current) =>
      current.includes(mimeType)
        ? current.filter((value) => value !== mimeType)
        : [...current, mimeType]
    );
    setMessage(null);
  }

  function addCustomMimeType() {
    const nextMimeType = customMimeType.trim().toLowerCase();
    if (!isValidMimeType(nextMimeType)) {
      setError("Inserisci un MIME type valido, ad esempio application/zip.");
      return;
    }
    setMimeTypes((current) =>
      current.includes(nextMimeType) ? current : [...current, nextMimeType]
    );
    setCustomMimeType("");
    setError(null);
    setMessage(null);
  }

  async function savePolicy() {
    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);

      const maxFileBytes = Math.round(
        readPositiveNumber(maxFileMegabytes, "La dimensione massima") * 1_000_000
      );
      const maxImagePixels = Math.round(
        readPositiveNumber(maxImageMegapixels, "La risoluzione massima") * 1_000_000
      );
      if (mimeTypes.length === 0) {
        throw new Error("Seleziona almeno un tipo di file consentito.");
      }

      await Promise.all([
        cms.settings.upsertSettingValue({
          path: { key: SETTINGS.maxFileBytes },
          body: { value: maxFileBytes, updatedBy: "backoffice" }
        }),
        cms.settings.upsertSettingValue({
          path: { key: SETTINGS.maxImagePixels },
          body: { value: maxImagePixels, updatedBy: "backoffice" }
        }),
        cms.settings.upsertSettingValue({
          path: { key: SETTINGS.allowedMimeTypes },
          body: { value: [...mimeTypes].sort(), updatedBy: "backoffice" }
        })
      ]);
      setMessage(t("settings.media.policy.saved", "Policy di caricamento aggiornata."));
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-6 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto grid max-w-4xl gap-6">
          <header className="grid gap-2">
            <h3 className="text-xl font-semibold text-[color:var(--color-ink)]">
              {t("settings.media.policy.title", "Regole di caricamento")}
            </h3>
            <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
              {t(
                "settings.media.policy.summary",
                "Definisci cosa possono caricare gli operatori, con limiti facili da comprendere."
              )}
            </p>
          </header>

          {error ? (
            <p className="rounded-md border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] p-3 text-sm text-[color:var(--color-danger-ink)]">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm font-medium text-[color:var(--color-success-ink)]">{message}</p>
          ) : null}

          <section className="grid gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <div>
              <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">Limiti</h4>
              <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
                Si applicano a ogni nuovo caricamento; i file già presenti non vengono modificati.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Dimensione massima per file (MB)"
                type="number"
                min="1"
                step="1"
                value={maxFileMegabytes}
                readOnly={isLoading || isSaving}
                onChange={(event) => {
                  setMaxFileMegabytes(event.currentTarget.value);
                  setMessage(null);
                }}
              />
              <Input
                label="Risoluzione massima immagini (MP)"
                hint="Megapixel: larghezza × altezza. Non limita PDF, audio o video."
                type="number"
                min="1"
                step="1"
                value={maxImageMegapixels}
                readOnly={isLoading || isSaving}
                onChange={(event) => {
                  setMaxImageMegapixels(event.currentTarget.value);
                  setMessage(null);
                }}
              />
            </div>
          </section>

          <section className="grid gap-5 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">
                  Tipi di file consentiti
                </h4>
                <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
                  Seleziona i formati che gli operatori possono caricare.
                </p>
              </div>
              <Badge tone="neutral">{mimeTypes.length} selezionati</Badge>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {MIME_TYPE_GROUPS.map((group) => (
                <section key={group.label} className="grid content-start gap-2">
                  <h5 className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
                    {group.label}
                  </h5>
                  {group.items.map(([mimeType, label]) => (
                    <Checkbox
                      key={mimeType}
                      label={label}
                      checked={mimeTypes.includes(mimeType)}
                      disabled={isLoading || isSaving}
                      onChange={() => toggleMimeType(mimeType)}
                    />
                  ))}
                </section>
              ))}
            </div>

            <div className="grid gap-3 border-t border-[color:var(--color-border)] pt-4">
              <div>
                <h5 className="text-sm font-semibold text-[color:var(--color-ink)]">
                  Formato personalizzato
                </h5>
                <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
                  Per formati non presenti nell&apos;elenco, ad esempio application/zip.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  className="min-w-0 flex-1"
                  aria-label="MIME type personalizzato"
                  placeholder="application/zip"
                  value={customMimeType}
                  readOnly={isLoading || isSaving}
                  onChange={(event) => setCustomMimeType(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomMimeType();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isLoading || isSaving}
                  onClick={addCustomMimeType}
                >
                  Aggiungi
                </Button>
              </div>
              {customMimeTypes.length ? (
                <div className="flex flex-wrap gap-2">
                  {customMimeTypes.map((mimeType) => (
                    <button
                      key={mimeType}
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggleMimeType(mimeType)}
                      className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-xs text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)]"
                      aria-label={`Rimuovi ${mimeType}`}
                    >
                      {mimeType} <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
      <footer className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 pb-2 pt-3 sm:px-5">
        <div className="mx-auto flex max-w-4xl justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || isSaving}
            onClick={() => void loadPolicy()}
          >
            {t("common.actions.refresh", "Aggiorna")}
          </Button>
          <Button type="button" disabled={isLoading || isSaving} onClick={() => void savePolicy()}>
            {isSaving
              ? t("common.actions.saving", "Salvataggio...")
              : t("common.actions.save", "Salva")}
          </Button>
        </div>
      </footer>
    </section>
  );
}

function formatMegabytes(bytes: number): string {
  return String(Math.max(1, Math.round(bytes / 1_000_000)));
}

function formatMegapixels(pixels: number): string {
  return String(Math.max(1, Math.round(pixels / 1_000_000)));
}

function readPositiveNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0)
    throw new Error(`${label} deve essere maggiore di zero.`);
  return parsed;
}

function isValidMimeType(value: string): boolean {
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(value);
}

function toDisplayError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Impossibile aggiornare le regole di caricamento.";
}
