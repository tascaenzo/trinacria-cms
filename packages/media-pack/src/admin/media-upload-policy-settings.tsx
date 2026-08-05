import type { createCmsSdkClient } from "@trinacria-cms/sdk";
import {
  Badge,
  Button,
  Checkbox,
  FeedbackBanner,
  FormSection,
  Input,
  SettingsSectionLayout,
  useToast
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useMemo, useState } from "react";

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

interface SavedUploadPolicy {
  maxFileMegabytes: string;
  maxImageMegapixels: string;
  mimeTypes: readonly string[];
}

export interface MediaUploadPolicySettingsContext {
  cms: CmsClient;
  onDirtyChange?: (isDirty: boolean) => void;
  t: (key: string, fallback?: string) => string;
}

export function MediaUploadPolicySettings({
  cms,
  onDirtyChange,
  t
}: MediaUploadPolicySettingsContext) {
  const [maxFileMegabytes, setMaxFileMegabytes] = useState("25");
  const [maxImageMegapixels, setMaxImageMegapixels] = useState("40");
  const [mimeTypes, setMimeTypes] = useState<readonly string[]>(DEFAULT_MIME_TYPES);
  const [savedPolicy, setSavedPolicy] = useState<SavedUploadPolicy>({
    maxFileMegabytes: "25",
    maxImageMegapixels: "40",
    mimeTypes: DEFAULT_MIME_TYPES
  });
  const [customMimeType, setCustomMimeType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

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
      const nextPolicy = {
        maxFileMegabytes: formatMegabytes(maxBytes),
        maxImageMegapixels: formatMegapixels(maxPixels),
        mimeTypes: configuredMimeTypes.length ? configuredMimeTypes : DEFAULT_MIME_TYPES
      };
      setMaxFileMegabytes(nextPolicy.maxFileMegabytes);
      setMaxImageMegapixels(nextPolicy.maxImageMegapixels);
      setMimeTypes(nextPolicy.mimeTypes);
      setSavedPolicy(nextPolicy);
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
  }

  async function savePolicy() {
    try {
      setIsSaving(true);
      setError(null);

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
      setSavedPolicy({ maxFileMegabytes, maxImageMegapixels, mimeTypes: [...mimeTypes] });
      pushToast({
        tone: "success",
        title: t("common.actions.save", "Salva"),
        description: t("settings.media.policy.saved", "Policy di caricamento aggiornata."),
        duration: 4000
      });
    } catch (currentError) {
      const message = toDisplayError(currentError);
      setError(message);
      pushToast({
        tone: "danger",
        title: "Salvataggio non riuscito",
        description: message,
        duration: 0
      });
    } finally {
      setIsSaving(false);
    }
  }

  const isDirty =
    maxFileMegabytes !== savedPolicy.maxFileMegabytes ||
    maxImageMegapixels !== savedPolicy.maxImageMegapixels ||
    JSON.stringify(mimeTypes) !== JSON.stringify(savedPolicy.mimeTypes);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  return (
    <SettingsSectionLayout
      title={t("settings.media.policy.title", "Regole di caricamento")}
      description={t(
        "settings.media.policy.summary",
        "Definisci cosa possono caricare gli operatori, con limiti facili da comprendere."
      )}
      feedback={error ? <FeedbackBanner tone="danger" message={error} /> : undefined}
      headerActions={
        <Button
          type="button"
          variant="secondary"
          disabled={isLoading || isSaving}
          onClick={() => void loadPolicy()}
        >
          {t("common.actions.refresh", "Aggiorna")}
        </Button>
      }
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || isSaving || !isDirty}
            onClick={() => {
              setMaxFileMegabytes(savedPolicy.maxFileMegabytes);
              setMaxImageMegapixels(savedPolicy.maxImageMegapixels);
              setMimeTypes([...savedPolicy.mimeTypes]);
              setCustomMimeType("");
              setError(null);
            }}
          >
            {t("common.actions.reset", "Ripristina")}
          </Button>
          <Button
            type="button"
            disabled={isLoading || isSaving || !isDirty}
            isLoading={isSaving}
            onClick={() => void savePolicy()}
          >
            {t("common.actions.save", "Salva")}
          </Button>
        </>
      }
    >
      <FormSection
        headingLevel={3}
        variant="plain"
        title="Limiti"
        description="Si applicano a ogni nuovo caricamento; i file già presenti non vengono modificati."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Dimensione massima per file (MB)"
            type="number"
            min="1"
            step="1"
            value={maxFileMegabytes}
            disabled={isLoading || isSaving}
            onChange={(event) => {
              setMaxFileMegabytes(event.currentTarget.value);
            }}
          />
          <Input
            label="Risoluzione massima immagini (MP)"
            hint="Megapixel: larghezza × altezza. Non limita PDF, audio o video."
            type="number"
            min="1"
            step="1"
            value={maxImageMegapixels}
            disabled={isLoading || isSaving}
            onChange={(event) => {
              setMaxImageMegapixels(event.currentTarget.value);
            }}
          />
        </div>
      </FormSection>

      <FormSection
        headingLevel={3}
        variant="plain"
        title="Tipi di file consentiti"
        description="Seleziona i formati che gli operatori possono caricare."
      >
        <div className="flex justify-end">
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
              disabled={isLoading || isSaving}
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
                <Button
                  key={mimeType}
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={() => toggleMimeType(mimeType)}
                  aria-label={`Rimuovi ${mimeType}`}
                >
                  {mimeType} <span aria-hidden="true">×</span>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </FormSection>
    </SettingsSectionLayout>
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
