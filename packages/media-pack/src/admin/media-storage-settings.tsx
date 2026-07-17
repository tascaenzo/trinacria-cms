import { useEffect, useState } from "react";
import { Button, Input, Select } from "@trinacria-cms/trinacria-ui";
import type { createCmsSdkClient } from "@trinacria-cms/sdk";

type CmsClient = ReturnType<typeof createCmsSdkClient>;
type ProviderId = "local-disk" | "s3-compatible" | "custom";

const SETTINGS = {
  provider: "media-pack:storage:default_provider_id",
  localRoot: "media-pack:storage:local_root",
  s3Endpoint: "media-pack:storage:s3_endpoint",
  s3Bucket: "media-pack:storage:s3_bucket",
  s3Region: "media-pack:storage:s3_region",
  s3AccessKey: "media-pack:storage:s3_access_key",
  s3SecretKey: "media-pack:storage:s3_secret_key"
} as const;

export interface MediaStorageSettingsContext {
  cms: CmsClient;
  t: (key: string, fallback?: string) => string;
}

interface StorageDraft {
  provider: string;
  localRoot: string;
  s3Endpoint: string;
  s3Bucket: string;
  s3Region: string;
  s3AccessKey: string;
  s3SecretKey: string;
}

const DEFAULT_DRAFT: StorageDraft = {
  provider: "local-disk",
  localRoot: ".trinacria/media",
  s3Endpoint: "",
  s3Bucket: "",
  s3Region: "us-east-1",
  s3AccessKey: "",
  s3SecretKey: ""
};

export function MediaStorageSettings({ cms, t }: MediaStorageSettingsContext) {
  const [draft, setDraft] = useState<StorageDraft>(DEFAULT_DRAFT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const provider = normalizeProviderId(draft.provider);

  useEffect(() => {
    void loadSettings();
  }, []);

  function updateDraft(update: Partial<StorageDraft>) {
    setDraft((current) => ({ ...current, ...update }));
    setError(null);
    setMessage(null);
  }

  async function loadSettings() {
    try {
      setIsLoading(true);
      setError(null);
      const [providerValue, localRoot, s3Endpoint, s3Bucket, s3Region] = await Promise.all([
        readValue(SETTINGS.provider, DEFAULT_DRAFT.provider),
        readValue(SETTINGS.localRoot, DEFAULT_DRAFT.localRoot),
        readValue(SETTINGS.s3Endpoint, DEFAULT_DRAFT.s3Endpoint),
        readValue(SETTINGS.s3Bucket, DEFAULT_DRAFT.s3Bucket),
        readValue(SETTINGS.s3Region, DEFAULT_DRAFT.s3Region)
      ]);
      setDraft({
        ...DEFAULT_DRAFT,
        provider: providerValue,
        localRoot,
        s3Endpoint,
        s3Bucket,
        s3Region
      });
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }

  async function readValue(key: string, fallback: string): Promise<string> {
    try {
      const response = await cms.settings.getSettingValueByKey({ path: { key } });
      return typeof response.data?.value === "string" ? response.data.value : fallback;
    } catch {
      return fallback;
    }
  }

  async function saveSettings() {
    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);
      validateDraft(draft, provider);

      const valueUpdates: Promise<unknown>[] = [];
      if (provider === "local-disk") {
        valueUpdates.push(writeValue(SETTINGS.localRoot, draft.localRoot.trim()));
      }
      if (provider === "s3-compatible") {
        valueUpdates.push(
          Promise.all([
            writeValue(SETTINGS.s3Endpoint, draft.s3Endpoint.trim()),
            writeValue(SETTINGS.s3Bucket, draft.s3Bucket.trim()),
            writeValue(SETTINGS.s3Region, draft.s3Region.trim())
          ])
        );
        if (draft.s3AccessKey.trim()) {
          valueUpdates.push(writeSecret(SETTINGS.s3AccessKey, draft.s3AccessKey.trim()));
        }
        if (draft.s3SecretKey.trim()) {
          valueUpdates.push(writeSecret(SETTINGS.s3SecretKey, draft.s3SecretKey.trim()));
        }
      }

      await Promise.all(valueUpdates);
      // Activate the provider only after its configuration has been persisted.
      await writeValue(SETTINGS.provider, draft.provider.trim());
      setDraft((current) => ({ ...current, s3AccessKey: "", s3SecretKey: "" }));
      setMessage(t("settings.media.storage.saved", "Archiviazione media aggiornata."));
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  function writeValue(key: string, value: string) {
    return cms.settings.upsertSettingValue({
      path: { key },
      body: { value, updatedBy: "backoffice" }
    });
  }

  function writeSecret(key: string, plaintext: string) {
    return cms.settings.upsertSettingSecret({
      path: { key },
      body: { plaintext, updatedBy: "backoffice" }
    });
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-6 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto grid max-w-4xl gap-6">
          <header className="grid gap-2">
            <h3 className="text-xl font-semibold text-[color:var(--color-ink)]">
              {t("settings.media.storage.title", "Archiviazione media")}
            </h3>
            <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
              {t(
                "settings.media.storage.summary",
                "Scegli dove conservare i nuovi file. I campi disponibili cambiano in base al provider selezionato."
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

          <section className="grid gap-4 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
            <Select
              label={t("settings.media.storage.provider", "Provider di archiviazione")}
              hint={t(
                "settings.media.storage.provider_hint",
                "Il provider viene applicato ai nuovi caricamenti."
              )}
              value={provider === "custom" ? draft.provider : provider}
              disabled={isLoading || isSaving}
              onChange={(event) => updateDraft({ provider: event.currentTarget.value })}
            >
              {provider === "custom" ? (
                <option value={draft.provider}>{draft.provider}</option>
              ) : null}
              <option value="local-disk">Disco locale</option>
              <option value="s3-compatible">S3 compatibile</option>
            </Select>
          </section>

          {!isLoading && provider === "local-disk" ? (
            <section className="grid gap-4 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
              <div>
                <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">
                  Disco locale
                </h4>
                <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
                  I file vengono salvati nel filesystem dell&apos;istanza CMS.
                </p>
              </div>
              <Input
                label={t("settings.media.storage.local_root", "Cartella dei media")}
                value={draft.localRoot}
                readOnly={isSaving}
                onChange={(event) => updateDraft({ localRoot: event.currentTarget.value })}
              />
            </section>
          ) : null}

          {!isLoading && provider === "s3-compatible" ? (
            <section className="grid gap-4 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
              <div>
                <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">
                  S3 compatibile
                </h4>
                <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
                  Configura bucket e credenziali del provider compatibile con le API S3.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Endpoint"
                  value={draft.s3Endpoint}
                  readOnly={isSaving}
                  onChange={(event) => updateDraft({ s3Endpoint: event.currentTarget.value })}
                />
                <Input
                  label="Bucket"
                  value={draft.s3Bucket}
                  readOnly={isSaving}
                  onChange={(event) => updateDraft({ s3Bucket: event.currentTarget.value })}
                />
                <Input
                  label="Region"
                  value={draft.s3Region}
                  readOnly={isSaving}
                  onChange={(event) => updateDraft({ s3Region: event.currentTarget.value })}
                />
                <Input
                  label="Access key"
                  value={draft.s3AccessKey}
                  type="password"
                  placeholder="Lascia vuoto per mantenere il valore"
                  readOnly={isSaving}
                  autoComplete="new-password"
                  onChange={(event) => updateDraft({ s3AccessKey: event.currentTarget.value })}
                />
                <Input
                  className="md:col-span-2"
                  label="Secret key"
                  value={draft.s3SecretKey}
                  type="password"
                  placeholder="Lascia vuoto per mantenere il valore"
                  readOnly={isSaving}
                  autoComplete="new-password"
                  onChange={(event) => updateDraft({ s3SecretKey: event.currentTarget.value })}
                />
              </div>
            </section>
          ) : null}

          {!isLoading && provider === "custom" ? (
            <section className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-ink-muted)]">
              Questo provider è configurato dall&apos;ambiente che lo ha registrato. Le impostazioni
              specifiche vengono mostrate dalla relativa funzionalità quando disponibili.
            </section>
          ) : null}
        </div>
      </div>
      <footer className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 pb-2 pt-3 sm:px-5">
        <div className="mx-auto flex max-w-4xl justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || isSaving}
            onClick={() => void loadSettings()}
          >
            {t("common.actions.refresh", "Aggiorna")}
          </Button>
          <Button
            type="button"
            disabled={isLoading || isSaving}
            onClick={() => void saveSettings()}
          >
            {isSaving
              ? t("common.actions.saving", "Salvataggio...")
              : t("common.actions.save", "Salva")}
          </Button>
        </div>
      </footer>
    </section>
  );
}

function normalizeProviderId(provider: string): ProviderId {
  if (provider === "local-disk" || provider === "s3-compatible") return provider;
  return "custom";
}

function validateDraft(draft: StorageDraft, provider: ProviderId) {
  if (!draft.provider.trim()) throw new Error("Seleziona un provider di archiviazione.");
  if (provider === "local-disk" && !draft.localRoot.trim()) {
    throw new Error("La cartella dei media è obbligatoria.");
  }
  if (provider === "s3-compatible" && (!draft.s3Bucket.trim() || !draft.s3Region.trim())) {
    throw new Error("Per S3 compatibile bucket e region sono obbligatori.");
  }
}

function toDisplayError(error: unknown): string {
  return error instanceof Error ? error.message : "Impossibile aggiornare l'archiviazione media.";
}
