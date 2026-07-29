import { Button, Dialog, Icon, Input, Select, Switch, Textarea } from "@trinacria-cms/trinacria-ui";
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
        if (mode === "manual") setMessage("Modifiche salvate.");
        return true;
      } catch (currentError) {
        setError(
          toEditorialDisplayError(currentError, "Non è stato possibile salvare il contenuto.")
        );
        return false;
      } finally {
        setIsSaving(false);
        setIsAutosaving(false);
      }
    },
    [cms, contentType, entry, resetDraft]
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
      setMessage(`Ripristinata la revisione ${revision.revisionNumber}.`);
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

        {error ? <Feedback tone="danger">{error}</Feedback> : null}
        {message ? <Feedback tone="success">{message}</Feedback> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="grid gap-6">
            <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-[color:var(--color-ink)]">
                    Corpo dell’articolo
                  </h2>
                  <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
                    Titolo e contenuto si modificano nell’editor dedicato.
                  </p>
                </div>
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
              </div>
              <button
                type="button"
                className="mt-5 block w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] p-5 text-left transition hover:border-[color:var(--color-ink-subtle)] hover:bg-[color:var(--color-interactive-hover)]"
                onClick={openContentEditor}
              >
                <span className="block text-xl font-semibold text-[color:var(--color-ink)]">
                  {draft.title || "Senza titolo"}
                </span>
                <span className="mt-2 line-clamp-2 block text-sm leading-6 text-[color:var(--color-ink-muted)]">
                  {documentPlainText(draft.body) || "Il documento non contiene ancora testo."}
                </span>
                <span className="mt-4 block text-xs text-[color:var(--color-ink-subtle)]">
                  {draft.body.blocks.length} {draft.body.blocks.length === 1 ? "blocco" : "blocchi"}
                </span>
              </button>
            </section>

            <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-5">
              <h2 className="text-base font-semibold text-[color:var(--color-ink)]">Dati base</h2>
              <div className="mt-4 grid gap-4">
                <Input
                  label="Slug"
                  value={draft.slug}
                  readOnly={isSaving}
                  onChange={(event) => updateDraft({ slug: event.currentTarget.value })}
                />
              </div>
            </section>

            <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-5">
              <h2 className="text-base font-semibold text-[color:var(--color-ink)]">
                Campi del modello
              </h2>
              <div className="mt-4 grid gap-4">
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
            </section>
          </div>

          <aside className="h-fit rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-5">
            <h2 className="text-base font-semibold text-[color:var(--color-ink)]">
              Pianificazione
            </h2>
            <div className="mt-4 grid gap-4">
              <Input
                label="ID revisore"
                value={draft.reviewerUserId}
                readOnly={isSaving}
                onChange={(event) => updateDraft({ reviewerUserId: event.currentTarget.value })}
              />
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
                onClick={() => {
                  setError(null);
                  void revisions.load();
                }}
              >
                <Icon name="history" className="h-4 w-4" /> Cronologia
              </Button>
              <p className="rounded-lg bg-[color:var(--color-surface-subtle)] p-3 text-xs text-[color:var(--color-ink-muted)]">
                Stato corrente: <strong>{entry.status}</strong>. Salva prima di eseguire una
                transizione dal desk.
              </p>
            </div>
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
            <div
              className={`mx-auto min-h-full transition-[width] ${previewDeviceClass(previewDevice)}`}
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
                  <Feedback tone="danger">{error}</Feedback>
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
              <Feedback tone="danger">{error}</Feedback>
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
    ? { label: "Salvataggio", tone: "bg-amber-500" }
    : isDirty
      ? { label: "Modifiche", tone: "bg-amber-500" }
      : { label: message ? "Salvato" : "Bozza", tone: "bg-emerald-500" };

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-0.5 shadow-[var(--shadow-sm)] sm:flex">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          iconOnly
          aria-label="Annulla"
          title="Annulla (⌘Z)"
          disabled={!canUndo || isSaving}
          onClick={onUndo}
        >
          <Icon name="arrow-left" className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          iconOnly
          aria-label="Ripristina"
          title="Ripristina (⌘⇧Z)"
          disabled={!canRedo || isSaving}
          onClick={onRedo}
        >
          <Icon name="arrow-right" className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-0.5 shadow-[var(--shadow-sm)]">
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
          <select
            aria-label="Larghezza anteprima"
            className="ml-0.5 hidden h-7 border-l border-[color:var(--color-border)] bg-transparent pl-2 pr-1 text-xs font-medium text-[color:var(--color-ink-muted)] outline-none sm:block"
            value={previewDevice}
            onChange={(event) => onPreviewDeviceChange(event.currentTarget.value as PreviewDevice)}
          >
            <option value="desktop">Desktop</option>
            <option value="tablet">Tablet</option>
            <option value="mobile">Mobile</option>
          </select>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-l border-[color:var(--color-border)] pl-2">
        <span
          aria-live="polite"
          className="hidden items-center gap-1.5 text-xs font-medium text-[color:var(--color-ink-muted)] lg:flex"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.tone}`} />
          {status.label}
        </span>
        <Button type="button" size="sm" isLoading={isSaving} disabled={isSaving} onClick={onSave}>
          <Icon name="save" className="h-4 w-4" />
          <span className="hidden sm:inline">Salva</span>
        </Button>
      </div>
    </div>
  );
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

function Feedback({ tone, children }: { tone: "danger" | "success"; children: string }) {
  return (
    <p
      role={tone === "danger" ? "alert" : undefined}
      className={`mt-5 rounded-lg p-3 text-sm ${
        tone === "danger"
          ? "border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]"
          : "bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]"
      }`}
    >
      {children}
    </p>
  );
}

function previewDeviceClass(device: PreviewDevice) {
  if (device === "mobile")
    return "max-w-[24rem] border-x border-[color:var(--color-border)] shadow-[var(--shadow-lg)]";
  if (device === "tablet")
    return "max-w-[52rem] border-x border-[color:var(--color-border)] shadow-[var(--shadow-lg)]";
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
      <div className="h-96 animate-pulse rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)]" />
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
