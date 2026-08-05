import type { createCmsSdkClient } from "@trinacria-cms/sdk";
import {
  Button,
  FeedbackBanner,
  FormSection,
  Input,
  Select,
  SettingsSectionLayout,
  useToast
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useState } from "react";

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
  onDirtyChange?: (isDirty: boolean) => void;
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

export function MediaStorageSettings({ cms, onDirtyChange, t }: MediaStorageSettingsContext) {
  const [draft, setDraft] = useState<StorageDraft>(DEFAULT_DRAFT);
  const [savedDraft, setSavedDraft] = useState<StorageDraft>(DEFAULT_DRAFT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  const provider = normalizeProviderId(draft.provider);

  useEffect(() => {
    void loadSettings();
  }, []);

  function updateDraft(update: Partial<StorageDraft>) {
    setDraft((current) => ({ ...current, ...update }));
    setError(null);
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
      const nextDraft = {
        ...DEFAULT_DRAFT,
        provider: providerValue,
        localRoot,
        s3Endpoint,
        s3Bucket,
        s3Region
      };
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
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
      setDraft((current) => {
        const committed = { ...current, s3AccessKey: "", s3SecretKey: "" };
        setSavedDraft(committed);
        return committed;
      });
      pushToast({
        tone: "success",
        title: t("common.actions.save", "Salva"),
        description: t("settings.media.storage.saved", "Archiviazione media aggiornata."),
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

  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  return (
    <SettingsSectionLayout
      title={t("settings.media.storage.title", "Archiviazione media")}
      description={t(
        "settings.media.storage.summary",
        "Scegli dove conservare i nuovi file. I campi disponibili cambiano in base al provider selezionato."
      )}
      feedback={error ? <FeedbackBanner tone="danger" message={error} /> : undefined}
      headerActions={
        <Button
          type="button"
          variant="secondary"
          disabled={isLoading || isSaving}
          onClick={() => void loadSettings()}
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
              setDraft({ ...savedDraft });
              setError(null);
            }}
          >
            {t("common.actions.reset", "Ripristina")}
          </Button>
          <Button
            type="button"
            disabled={isLoading || isSaving || !isDirty}
            isLoading={isSaving}
            onClick={() => void saveSettings()}
          >
            {t("common.actions.save", "Salva")}
          </Button>
        </>
      }
    >
      <FormSection
        headingLevel={3}
        variant="plain"
        title={t("settings.media.storage.provider", "Provider di archiviazione")}
        description={t(
          "settings.media.storage.provider_hint",
          "Il provider viene applicato ai nuovi caricamenti."
        )}
      >
        <Select
          label={t("settings.media.storage.provider", "Provider")}
          value={provider === "custom" ? draft.provider : provider}
          disabled={isLoading || isSaving}
          onChange={(event) => updateDraft({ provider: event.currentTarget.value })}
        >
          {provider === "custom" ? <option value={draft.provider}>{draft.provider}</option> : null}
          <option value="local-disk">Disco locale</option>
          <option value="s3-compatible">S3 compatibile</option>
        </Select>
      </FormSection>

      {!isLoading && provider === "local-disk" ? (
        <FormSection
          headingLevel={3}
          variant="plain"
          title="Disco locale"
          description="I file vengono salvati nel filesystem dell'istanza CMS."
        >
          <Input
            label={t("settings.media.storage.local_root", "Cartella dei media")}
            value={draft.localRoot}
            disabled={isSaving}
            onChange={(event) => updateDraft({ localRoot: event.currentTarget.value })}
          />
        </FormSection>
      ) : null}

      {!isLoading && provider === "s3-compatible" ? (
        <FormSection
          headingLevel={3}
          variant="plain"
          title="S3 compatibile"
          description="Configura bucket e credenziali del provider compatibile con le API S3."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Endpoint"
              value={draft.s3Endpoint}
              disabled={isSaving}
              onChange={(event) => updateDraft({ s3Endpoint: event.currentTarget.value })}
            />
            <Input
              label="Bucket"
              value={draft.s3Bucket}
              disabled={isSaving}
              onChange={(event) => updateDraft({ s3Bucket: event.currentTarget.value })}
            />
            <Input
              label="Region"
              value={draft.s3Region}
              disabled={isSaving}
              onChange={(event) => updateDraft({ s3Region: event.currentTarget.value })}
            />
            <Input
              label="Access key"
              value={draft.s3AccessKey}
              type="password"
              placeholder="Lascia vuoto per mantenere il valore"
              disabled={isSaving}
              autoComplete="new-password"
              onChange={(event) => updateDraft({ s3AccessKey: event.currentTarget.value })}
            />
            <Input
              className="md:col-span-2"
              label="Secret key"
              value={draft.s3SecretKey}
              type="password"
              placeholder="Lascia vuoto per mantenere il valore"
              disabled={isSaving}
              autoComplete="new-password"
              onChange={(event) => updateDraft({ s3SecretKey: event.currentTarget.value })}
            />
          </div>
        </FormSection>
      ) : null}

      {!isLoading && provider === "custom" ? (
        <FeedbackBanner
          tone="info"
          message="Questo provider è configurato dall'ambiente che lo ha registrato. Le impostazioni specifiche vengono mostrate dalla relativa funzionalità quando disponibili."
        />
      ) : null}
    </SettingsSectionLayout>
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
