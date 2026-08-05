import {
  Button,
  Dialog,
  DropdownMenu,
  DropdownMenuItem,
  ErrorBanner,
  FormSection,
  Icon,
  IconButton,
  Input,
  Panel,
  Select,
  Switch,
  Textarea,
  useToast
} from "@trinacria-cms/trinacria-ui";
import { useCallback, useEffect, useState } from "react";
import {
  clearDraftRecovery,
  draftFingerprint,
  readDraftRecovery,
  useDraftPersistence,
  useEditorDraft
} from "./editor/use-editor-draft.js";
import { useEditorRevisions } from "./editor/use-editor-revisions.js";
import type {
  CmsClient,
  ContentTypeField,
  EditorialContentType,
  EditorialEntryRecord,
  EditorialNavigator
} from "./editorial-admin.types.js";
import { EditorialBlockEditor } from "./editorial-block-editor.js";
import { EditorialDocumentPreview } from "./editorial-document-preview.js";
import {
  documentPlainText,
  type EntryDraft,
  toEntryDraft,
  toEntryUpdatePayload
} from "./editorial-entry-draft.js";
import { EditorialRevisionsDialog, type EditorRevision } from "./editorial-revisions-dialog.js";
import { toEditorialDisplayError } from "./lib/editorial-admin-errors.js";

const NAVIGATION_EVENT = "trinacria-cms:backoffice-navigation";

export interface EditorialEntryDetailPageContext {
  cms: CmsClient;
  apiBaseUrl?: string;
  /** Optional public preview URL. Supports {id} and {slug} placeholders. */
  previewUrl?: string;
  navigateToRoute?: EditorialNavigator;
}

type PreviewDevice = "desktop" | "tablet" | "mobile";

/** Working surface for writers; model fields are rendered dynamically. */
export function EditorialEntryDetailPage({
  apiBaseUrl,
  cms,
  navigateToRoute,
  previewUrl
}: EditorialEntryDetailPageContext) {
  const entryId = useRouteEntryId();
  const [entry, setEntry] = useState<EditorialEntryRecord | null>(null);
  const [contentType, setContentType] = useState<EditorialContentType | null>(null);
  const {
    canRedo,
    canUndo,
    draft,
    draftRef,
    isDirty,
    markSaved,
    redo,
    reset: resetDraft,
    restoreLocalDraft,
    undo,
    update: updateDraft
  } = useEditorDraft();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isContentEditorOpen, setIsContentEditorOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [isCloseConfirmationOpen, setIsCloseConfirmationOpen] = useState(false);
  const [recoveryDraft, setRecoveryDraft] = useState<EntryDraft | null>(null);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const { pushToast } = useToast();
  const showEditorialError = useCallback((currentError: unknown, fallback: string) => {
    setError(toEditorialDisplayError(currentError, fallback));
  }, []);
  const revisions = useEditorRevisions({
    cms,
    entryId: entry?.id,
    onError: showEditorialError
  });

  const openContentEditor = () => {
    setIsPreviewMode(false);
    setIsContentEditorOpen(true);
  };

  const load = useCallback(async () => {
    if (!entryId) {
      setEntry(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const entryResponse = await cms.request<{ data: EditorialEntryRecord }>({
        method: "GET",
        path: `/v1/editorial/entries/${entryId}`
      });
      const modelResponse = await cms.request<{ data: EditorialContentType }>({
        method: "GET",
        path: `/v1/editorial/content-types/${entryResponse.data.contentTypeId}`
      });
      const serverDraft = toEntryDraft(entryResponse.data);
      setEntry(entryResponse.data);
      setContentType(modelResponse.data);
      resetDraft(serverDraft);
      const recovered = readDraftRecovery(entryResponse.data.id);
      if (
        recovered &&
        recovered.savedAt > new Date(entryResponse.data.updatedAt).getTime() &&
        draftFingerprint(recovered.draft) !== draftFingerprint(serverDraft)
      ) {
        setRecoveryDraft(recovered.draft);
      }
    } catch (currentError) {
      setEntry(null);
      setContentType(null);
      setError(
        toEditorialDisplayError(currentError, "Non è stato possibile caricare il contenuto.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [cms, entryId, resetDraft]);

  useEffect(() => void load(), [load]);

  const save = useCallback(
    async (mode: "manual" | "auto" = "manual") => {
      if (!entry || !contentType) return false;
      try {
        setIsSaving(true);
        setIsAutosaving(mode === "auto");
        setError(null);
        setMessage(null);
        const response = await cms.request<{ data: EditorialEntryRecord }>({
          method: "PATCH",
          path: `/v1/editorial/entries/${entry.id}`,
          body: toEntryUpdatePayload(entry, draftRef.current)
        });
        setEntry(response.data);
        markSaved(toEntryDraft(response.data));
        clearDraftRecovery(response.data.id);
        if (mode === "manual") {
          const message = "Modifiche salvate.";
          setMessage(message);
          pushToast({ tone: "success", title: "Contenuto", description: message, duration: 4000 });
        }
        return true;
      } catch (currentError) {
        const message = toEditorialDisplayError(
          currentError,
          "Non è stato possibile salvare il contenuto."
        );
        setError(message);
        pushToast({
          tone: "danger",
          title: "Salvataggio non riuscito",
          description: message,
          duration: 0
        });
        return false;
      } finally {
        setIsSaving(false);
        setIsAutosaving(false);
      }
    },
    [cms, contentType, entry, pushToast, resetDraft]
  );

  const autosave = useCallback(() => void save("auto"), [save]);
  useDraftPersistence({ draft, entryId: entry?.id, isDirty, onAutosave: autosave });

  useEffect(() => {
    if (!isContentEditorOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isContentEditorOpen, redo, save, undo]);

  const requestCloseContentEditor = () => {
    if (isDirty) setIsCloseConfirmationOpen(true);
    else setIsContentEditorOpen(false);
  };

  const restoreRevision = async (revision: EditorRevision) => {
    const restored = await revisions.restore(revision);
    if (restored) {
      setEntry(restored);
      resetDraft(toEntryDraft(restored));
      clearDraftRecovery(restored.id);
      revisions.setIsOpen(false);
      const message = `Ripristinata la revisione ${revision.revisionNumber}.`;
      setMessage(message);
      pushToast({ tone: "success", title: "Contenuto", description: message, duration: 4000 });
    }
  };

  if (isLoading) return <LoadingEditor />;
  if (!entry || !contentType) {
    return (
      <MissingEditor
        error={error}
        onBack={() => navigateToRoute?.("editorial-entries", contentTypeParams(contentType))}
      />
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Torna ai contenuti"
              onClick={() => navigateToRoute?.("editorial-entries", contentTypeParams(contentType))}
            >
              <Icon name="arrow-left" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs text-[color:var(--color-ink-subtle)]">{contentType.name}</p>
              <h1 className="truncate text-lg font-semibold text-[color:var(--color-ink)]">
                {draft.title || "Senza titolo"}
              </h1>
            </div>
          </div>
          <Button type="button" size="sm" disabled={isSaving} onClick={() => void save()}>
            {isSaving ? "Salvataggio…" : "Salva"}
          </Button>
        </header>

        {error ? <ErrorBanner className="mt-5" message={error} /> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="grid gap-6">
            <FormSection
              actions={
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={openContentEditor}
                >
                  <Icon name="pencil" />
                  Apri editor
                </Button>
              }
            >
              <button
                type="button"
                className="group block w-full text-left"
                onClick={openContentEditor}
              >
                <span className="block text-xl font-semibold text-[color:var(--color-ink)]">
                  {draft.title || "Senza titolo"}
                </span>
                <span className="relative mt-3 block max-h-24 overflow-hidden">
                  <span className="block text-sm leading-6 text-[color:var(--color-ink-muted)]">
                    {documentPlainText(draft.body) || "Il documento non contiene ancora testo."}
                  </span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[color:var(--color-panel)] to-transparent"
                  />
                </span>
                <span className="mt-3 flex items-center justify-between gap-3 text-xs text-[color:var(--color-ink-subtle)]">
                  <span>
                    {draft.body.blocks.length}{" "}
                    {draft.body.blocks.length === 1 ? "blocco" : "blocchi"}
                  </span>
                  <span className="font-medium text-[color:var(--color-ink-muted)] group-hover:text-[color:var(--color-ink)]">
                    Continua nell’editor →
                  </span>
                </span>
              </button>
            </FormSection>

            <FormSection title="Campi del modello">
              <div className="grid gap-4">
                {contentType.fields.length ? (
                  contentType.fields.map((field) => (
                    <DynamicField
                      key={field.key}
                      field={field}
                      value={draft.data[field.key]}
                      disabled={isSaving}
                      onChange={(value) =>
                        updateDraft({ data: { ...draft.data, [field.key]: value } })
                      }
                    />
                  ))
                ) : (
                  <p className="text-sm text-[color:var(--color-ink-muted)]">
                    Questo modello usa soltanto i campi editoriali principali.
                  </p>
                )}
              </div>
            </FormSection>
          </div>

          <aside className="h-fit lg:sticky lg:top-6">
            <FormSection title="Dati base">
              <Input
                label="Slug"
                value={draft.slug}
                readOnly={isSaving}
                onChange={(event) => updateDraft({ slug: event.currentTarget.value })}
              />
              <div className="grid gap-4 border-t border-[color:var(--color-border)] pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">
                    Pubblicazione
                  </h3>
                  <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
                    Stato corrente: <strong>{entry.status}</strong>. Salva prima di eseguire una
                    transizione dal desk.
                  </p>
                </div>
                <Input
                  label="Pubblica non prima di"
                  type="datetime-local"
                  value={draft.scheduledAt}
                  readOnly={isSaving}
                  onChange={(event) => updateDraft({ scheduledAt: event.currentTarget.value })}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-fit"
                  onClick={() => {
                    setError(null);
                    void revisions.load();
                  }}
                >
                  <Icon name="history" className="h-4 w-4" /> Cronologia
                </Button>
              </div>
            </FormSection>
          </aside>
        </div>
      </main>

      <Dialog
        open={isContentEditorOpen}
        width="fullscreen"
        chrome="workspace"
        closeVariant="icon"
        closeLabel="Chiudi editor"
        eyebrow={contentType.name}
        title={draft.title || "Senza titolo"}
        description="Editor a blocchi del contenuto"
        onClose={requestCloseContentEditor}
        headerActions={
          <EditorialEditorToolbar
            canRedo={canRedo}
            canUndo={canUndo}
            isDirty={isDirty}
            isPreviewMode={isPreviewMode}
            isSaving={isSaving || isAutosaving}
            message={message}
            previewDevice={previewDevice}
            onPreviewDeviceChange={setPreviewDevice}
            onRedo={redo}
            onSave={() => void save()}
            onTogglePreview={() => setIsPreviewMode((current) => !current)}
            onUndo={undo}
          />
        }
      >
        <div className="min-h-full bg-[color:var(--color-panel)]">
          {isPreviewMode ? (
            <div className="min-h-full bg-[color:var(--color-surface)]">
              <div
                className={`mx-auto min-h-[calc(100vh-8rem)] w-full bg-[color:var(--color-surface)] transition-[width] ${previewDeviceClass(previewDevice)}`}
              >
                {resolvePublicPreviewUrl(previewUrl, entry, draft) ? (
                  <iframe
                    className="min-h-[calc(100vh-8rem)] w-full border-0 bg-white"
                    src={resolvePublicPreviewUrl(previewUrl, entry, draft) ?? undefined}
                    title="Anteprima sito"
                  />
                ) : (
                  <EditorialDocumentPreview
                    apiBaseUrl={apiBaseUrl}
                    cms={cms}
                    document={draft.body}
                    title={draft.title}
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="mx-auto w-full max-w-3xl px-5 pt-16 sm:px-10 sm:pt-20">
                <div className="pl-12 pr-2">
                  <textarea
                    rows={1}
                    aria-label="Titolo articolo"
                    placeholder="Senza titolo"
                    value={draft.title}
                    disabled={isSaving}
                    className="block w-full overflow-hidden border-0 bg-transparent px-1 text-4xl font-bold leading-tight tracking-tight text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)] sm:text-5xl"
                    style={{
                      fieldSizing: "content",
                      fontSize: "3rem",
                      fontWeight: 700,
                      lineHeight: 1.05,
                      resize: "none"
                    }}
                    onChange={(event) => updateDraft({ title: event.currentTarget.value })}
                  />
                </div>
              </div>
              {error ? (
                <div className="mx-auto w-full max-w-3xl px-5 sm:px-10">
                  <ErrorBanner className="mt-5" message={error} />
                </div>
              ) : null}
              <EditorialBlockEditor
                apiBaseUrl={apiBaseUrl}
                cms={cms}
                value={draft.body}
                disabled={isSaving}
                onChange={(body) => updateDraft({ body })}
              />
            </>
          )}
          {isPreviewMode && error ? (
            <div className="mx-auto w-full max-w-3xl px-5 sm:px-10">
              <ErrorBanner className="mt-5" message={error} />
            </div>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={recoveryDraft !== null}
        title="Bozza locale trovata"
        description="Sono state trovate modifiche non ancora salvate sul server."
        closeLabel="Ignora bozza"
        closeVariant="icon"
        onClose={() => {
          if (entry) clearDraftRecovery(entry.id);
          setRecoveryDraft(null);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (entry) clearDraftRecovery(entry.id);
                setRecoveryDraft(null);
              }}
            >
              Ignora
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (recoveryDraft) restoreLocalDraft(recoveryDraft);
                setRecoveryDraft(null);
              }}
            >
              Ripristina bozza
            </Button>
          </>
        }
      >
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Puoi continuare a scrivere da questa bozza oppure tenerne la versione salvata.
        </p>
      </Dialog>

      <Dialog
        open={isCloseConfirmationOpen}
        title="Chiudere l’editor?"
        description="Ci sono modifiche non ancora salvate sul server."
        closeLabel="Continua a modificare"
        closeVariant="icon"
        onClose={() => setIsCloseConfirmationOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setIsCloseConfirmationOpen(false)}>
              Continua a modificare
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCloseConfirmationOpen(false);
                setIsContentEditorOpen(false);
              }}
            >
              Chiudi senza salvare
            </Button>
          </>
        }
      >
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          La bozza resta disponibile per il recupero automatico quando riapri il contenuto.
        </p>
      </Dialog>

      <EditorialRevisionsDialog
        current={entry}
        isCreating={revisions.isCreating}
        isLoading={revisions.isLoading}
        isRestoring={revisions.isRestoring}
        open={revisions.isOpen}
        revisions={revisions.revisions}
        onClose={() => revisions.setIsOpen(false)}
        onCreate={() => void revisions.createSnapshot()}
        onRestore={restoreRevision}
      />
    </>
  );
}

function contentTypeParams(contentType: EditorialContentType | null) {
  const routeModelId =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("modelId");
  const modelId = contentType?.id ?? routeModelId;
  return modelId ? new URLSearchParams({ modelId }) : undefined;
}

function EditorialEditorToolbar({
  canRedo,
  canUndo,
  isDirty,
  isPreviewMode,
  isSaving,
  message,
  onPreviewDeviceChange,
  onRedo,
  onSave,
  onTogglePreview,
  onUndo,
  previewDevice
}: {
  canRedo: boolean;
  canUndo: boolean;
  isDirty: boolean;
  isPreviewMode: boolean;
  isSaving: boolean;
  message: string | null;
  onPreviewDeviceChange: (device: PreviewDevice) => void;
  onRedo: () => void;
  onSave: () => void;
  onTogglePreview: () => void;
  onUndo: () => void;
  previewDevice: PreviewDevice;
}) {
  const status = isSaving
    ? { label: "Salvataggio" }
    : isDirty
      ? { label: "Modifiche" }
      : { label: message ? "Salvato" : "Bozza" };

  return (
    <div className="flex items-center gap-1.5">
      <div className="hidden items-center gap-0.5 border-r border-[color:var(--color-border)] pr-1.5 sm:flex">
        <IconButton
          type="button"
          size="sm"
          variant="ghost"
          icon="undo-2"
          label="Annulla"
          title="Annulla (⌘Z)"
          disabled={!canUndo || isSaving}
          onClick={onUndo}
        />
        <IconButton
          type="button"
          size="sm"
          variant="ghost"
          icon="redo-2"
          label="Ripristina"
          title="Ripristina (⌘⇧Z)"
          disabled={!canRedo || isSaving}
          onClick={onRedo}
        />
      </div>

      <Button
        type="button"
        size="sm"
        variant={isPreviewMode ? "secondary" : "ghost"}
        className="gap-1.5 px-2.5"
        onClick={onTogglePreview}
      >
        <Icon name={isPreviewMode ? "pencil" : "eye"} className="h-4 w-4" />
        <span className="hidden sm:inline">{isPreviewMode ? "Modifica" : "Anteprima"}</span>
      </Button>
      {isPreviewMode ? (
        <DropdownMenu
          trigger={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="hidden gap-1 px-2 sm:inline-flex"
            >
              {previewDeviceLabel(previewDevice)}
              <Icon name="chevron-down" className="h-3.5 w-3.5" />
            </Button>
          }
        >
          <DropdownMenuItem icon="columns-3" onClick={() => onPreviewDeviceChange("desktop")}>
            Desktop
          </DropdownMenuItem>
          <DropdownMenuItem icon="file-text" onClick={() => onPreviewDeviceChange("tablet")}>
            Tablet
          </DropdownMenuItem>
          <DropdownMenuItem icon="file" onClick={() => onPreviewDeviceChange("mobile")}>
            Mobile
          </DropdownMenuItem>
        </DropdownMenu>
      ) : null}

      <div className="flex items-center border-l border-[color:var(--color-border)] pl-1.5">
        <span aria-live="polite" className="sr-only">
          {status.label}
        </span>
        <Button
          type="button"
          size="sm"
          variant={isDirty ? "primary" : "secondary"}
          className="min-w-[5.75rem] shadow-none"
          isLoading={isSaving}
          disabled={isSaving || !isDirty}
          onClick={onSave}
        >
          {!isSaving ? <Icon name={isDirty ? "save" : "check"} className="h-4 w-4" /> : null}
          <span>{isSaving ? "Salvataggio" : isDirty ? "Salva" : "Salvato"}</span>
        </Button>
      </div>
    </div>
  );
}

function previewDeviceLabel(device: PreviewDevice) {
  if (device === "mobile") return "Mobile";
  if (device === "tablet") return "Tablet";
  return "Desktop";
}

function DynamicField({
  disabled,
  field,
  onChange,
  value
}: {
  disabled: boolean;
  field: ContentTypeField;
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  const stringValue = typeof value === "string" ? value : "";
  if (field.type === "boolean") {
    return (
      <Switch
        label={field.label}
        description={field.helpText}
        checked={value === true}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    );
  }
  if (field.type === "select") {
    return (
      <Select
        label={field.label}
        value={stringValue}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">Seleziona…</option>
        {field.config?.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    );
  }
  if (["json", "rich_text", "repeatable"].includes(field.type)) {
    return (
      <Textarea
        label={field.label}
        hint={field.helpText ?? "JSON"}
        rows={6}
        value={value === undefined ? "" : JSON.stringify(value, null, 2)}
        readOnly={disabled}
        onChange={(event) => onChange(parseJsonOrText(event.currentTarget.value))}
      />
    );
  }
  return (
    <Input
      label={field.label}
      hint={field.helpText}
      type={inputType(field.type)}
      value={stringValue}
      readOnly={disabled}
      onChange={(event) =>
        onChange(
          field.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value
        )
      }
    />
  );
}

function inputType(fieldType: ContentTypeField["type"]) {
  if (fieldType === "number") return "number";
  if (fieldType === "date_time") return "datetime-local";
  if (fieldType === "url") return "url";
  return "text";
}

function parseJsonOrText(value: string): unknown {
  if (!value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function previewDeviceClass(device: PreviewDevice) {
  if (device === "mobile")
    return "max-w-[26rem] border-x border-[color:var(--color-border)] px-3 py-4";
  if (device === "tablet")
    return "max-w-[56rem] border-x border-[color:var(--color-border)] px-5 py-5";
  return "max-w-none";
}

function resolvePublicPreviewUrl(
  template: string | undefined,
  entry: EditorialEntryRecord,
  draft: EntryDraft
) {
  if (!template?.trim()) return null;
  return template
    .replaceAll("{id}", encodeURIComponent(entry.id))
    .replaceAll("{slug}", encodeURIComponent(draft.slug || entry.slug || ""));
}

function LoadingEditor() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8">
      <Panel aria-hidden="true" className="h-96 animate-pulse" />
    </main>
  );
}

function MissingEditor({ error, onBack }: { error: string | null; onBack: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <Button type="button" variant="ghost" onClick={onBack}>
        <Icon name="arrow-left" />
        Torna ai contenuti
      </Button>
      <h1 className="mt-6 text-2xl font-semibold">Contenuto non trovato</h1>
      <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
        {error ?? "Scegli un contenuto dal desk editoriale."}
      </p>
    </main>
  );
}

function useRouteEntryId() {
  const [entryId, setEntryId] = useState(readEntryId);
  useEffect(() => {
    const sync = () => setEntryId(readEntryId());
    window.addEventListener(NAVIGATION_EVENT, sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener(NAVIGATION_EVENT, sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  return entryId;
}

function readEntryId() {
  return typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("entryId");
}
