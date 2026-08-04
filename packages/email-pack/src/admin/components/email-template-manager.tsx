import type { createCmsSdkClient, EmailApi } from "@trinacria-cms/sdk";
import {
  Badge,
  Button,
  Dialog,
  Disclosure,
  EmptyState,
  ErrorBanner,
  FeedbackBanner,
  FormSection,
  Input,
  Panel,
  Select,
  SelectableCard,
  SettingsSectionLayout,
  Tabs,
  Textarea,
  useToast
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useMemo, useState } from "react";

type CmsClient = ReturnType<typeof createCmsSdkClient>;
type EmailTemplateRecord = Awaited<ReturnType<EmailApi["listEmailTemplates"]>>["data"][number];
type EmailTemplateStatus = "active" | "disabled";
type EmailPreviewMode = "html" | "text";

export interface EmailTemplateManagerContext {
  cms: CmsClient & {
    email: EmailApi;
  };
  onDirtyChange?: (isDirty: boolean) => void;
  t: (key: string, fallback?: string) => string;
}

interface EmailTemplateDraft {
  key: string;
  locale: string;
  name: string;
  description: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  variablesText: string;
  status: EmailTemplateStatus;
}

interface EmailTemplatePreview {
  subject: string;
  text: string;
  html?: string;
}

export function EmailTemplateManager({ cms, onDirtyChange, t }: EmailTemplateManagerContext) {
  const [templates, setTemplates] = useState<readonly EmailTemplateRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmailTemplateDraft | null>(null);
  const [savedDraft, setSavedDraft] = useState<EmailTemplateDraft | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewMode, setPreviewMode] = useState<EmailPreviewMode>("html");
  const { pushToast } = useToast();

  useEffect(() => {
    void loadTemplates();
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? templates[0] ?? null,
    [selectedId, templates]
  );

  useEffect(() => {
    if (selectedTemplate) {
      const nextDraft = toDraft(selectedTemplate);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setPreview(null);
    }
  }, [selectedTemplate]);

  async function loadTemplates() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await cms.email.listEmailTemplates();
      setTemplates(response.data);
      setSelectedId((current) => current ?? response.data[0]?.id ?? null);
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveTemplate() {
    if (!draft) return;
    try {
      setIsSaving(true);
      setError(null);
      const variables = parseVariables(draft.variablesText);
      const response = await cms.email.upsertEmailTemplate({
        body: {
          key: draft.key,
          locale: draft.locale,
          name: draft.name,
          ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
          subject: draft.subject,
          textBody: draft.textBody,
          ...(draft.htmlBody.trim() ? { htmlBody: draft.htmlBody } : {}),
          variables,
          status: draft.status
        }
      });
      setTemplates((current) => upsertTemplateRecord(current, response.data));
      setSelectedId(response.data.id);
      const committed = toDraft(response.data);
      setDraft(committed);
      setSavedDraft(committed);
      pushToast({
        tone: "success",
        title: t("common.actions.save", "Salva"),
        description: t("settings.email_templates.saved", "Template salvato."),
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

  async function previewTemplate() {
    if (!draft) return;
    try {
      setIsPreviewing(true);
      setError(null);
      setPreview(null);
      const response = await cms.email.previewEmailTemplate({
        body: {
          key: draft.key,
          locale: draft.locale,
          variables: createPreviewVariables(parseVariables(draft.variablesText))
        }
      });
      setPreview(response.data);
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsPreviewing(false);
    }
  }

  function updateDraft(update: Partial<EmailTemplateDraft>) {
    setDraft((current) => (current ? { ...current, ...update } : current));
    setPreview(null);
  }

  const variableNames = useMemo(() => (draft ? parseVariables(draft.variablesText) : []), [draft]);
  const localPreview = useMemo(
    () =>
      draft
        ? renderDraftPreview(draft, createPreviewVariables(parseVariables(draft.variablesText)))
        : null,
    [draft]
  );
  const previewDocument = useMemo(
    () => createPreviewDocument(localPreview?.html, localPreview?.text ?? ""),
    [localPreview]
  );
  const isDirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(savedDraft);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  function requestTemplateSelection(templateId: string) {
    if (templateId === selectedTemplate?.id) return;
    if (isDirty) {
      setPendingTemplateId(templateId);
      return;
    }
    setSelectedId(templateId);
  }

  function discardDraftAndSelectTemplate() {
    const templateId = pendingTemplateId;
    setPendingTemplateId(null);
    if (templateId) setSelectedId(templateId);
  }

  if (isLoading) {
    return (
      <SettingsSectionLayout
        title={t("settings.email_templates.title", "Template email")}
        description={t(
          "settings.section.email_templates.summary",
          "Gestisci contenuti, variabili e anteprima delle email transazionali."
        )}
        width="full"
      >
        <EmptyState text={t("settings.email_templates.loading", "Caricamento template...")} />
      </SettingsSectionLayout>
    );
  }

  if (!draft) {
    return (
      <SettingsSectionLayout
        title={t("settings.email_templates.title", "Template email")}
        description={t(
          "settings.section.email_templates.summary",
          "Gestisci contenuti, variabili e anteprima delle email transazionali."
        )}
        feedback={error ? <ErrorBanner message={error} /> : undefined}
        width="full"
      >
        <EmptyState text={t("settings.email_templates.empty", "Nessun template email trovato.")} />
      </SettingsSectionLayout>
    );
  }

  return (
    <section className="grid h-full min-h-0 gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="min-h-0 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] lg:overflow-auto lg:border-b-0 lg:border-r">
        <div className="p-4 lg:hidden">
          <Select
            label={t("settings.email_templates.template", "Template")}
            value={selectedTemplate?.id ?? ""}
            onChange={(event) => requestTemplateSelection(event.currentTarget.value)}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.locale}
              </option>
            ))}
          </Select>
        </div>
        <div className="hidden px-6 py-4 lg:block">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
            {t("settings.email_templates.title", "Template email")}
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {templates.length} {t("settings.email_templates.count_label", "template")}
          </p>
        </div>
        <div className="hidden gap-1 px-4 py-4 lg:grid">
          {templates.map((template) => (
            <SelectableCard
              key={template.id}
              padding="sm"
              selected={template.id === selectedTemplate?.id}
              onClick={() => requestTemplateSelection(template.id)}
              className="grid min-h-16 gap-1"
            >
              <span className="truncate text-sm font-semibold">{template.name}</span>
              <span className="truncate text-xs">{template.key}</span>
              <span className="flex items-center gap-2">
                <Badge tone={template.status === "active" ? "success" : "warning"}>
                  {template.status}
                </Badge>
                <span className="text-xs text-[color:var(--color-ink-muted)]">
                  {template.locale}
                </span>
              </span>
            </SelectableCard>
          ))}
        </div>
      </aside>

      <SettingsSectionLayout
        title={draft.name}
        description={`${draft.key} · ${draft.locale}`}
        width="full"
        headerActions={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving || isDirty}
              onClick={() => void loadTemplates()}
            >
              {t("common.actions.refresh", "Aggiorna")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPreviewing || isSaving}
              isLoading={isPreviewing}
              onClick={() => void previewTemplate()}
            >
              {t("settings.email_templates.validate_saved", "Valida versione salvata")}
            </Button>
          </>
        }
        feedback={
          error || preview ? (
            <div className="grid gap-3">
              {error ? <ErrorBanner message={error} /> : null}
              {preview ? (
                <FeedbackBanner
                  tone="success"
                  message={t(
                    "settings.email_templates.server_preview_ok",
                    "Validazione completata: il template salvato viene renderizzato correttamente."
                  )}
                />
              ) : null}
            </div>
          ) : undefined
        }
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving || !isDirty}
              onClick={() => {
                if (savedDraft) setDraft({ ...savedDraft });
                setError(null);
                setPreview(null);
              }}
            >
              {t("common.actions.reset", "Ripristina")}
            </Button>
            <Button
              type="button"
              disabled={isSaving || !isDirty}
              isLoading={isSaving}
              onClick={() => void saveTemplate()}
            >
              {t("common.actions.save", "Salva")}
            </Button>
          </>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
          <div className="grid content-start gap-5">
            <FormSection
              headingLevel={3}
              variant="plain"
              title={t("settings.email_templates.identity", "Identità e invio")}
              description={t(
                "settings.email_templates.identity_hint",
                "Definisci il nome operativo, lo stato e l'oggetto mostrato al destinatario."
              )}
            >
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                <Input
                  label={t("settings.email_templates.name", "Nome template")}
                  value={draft.name}
                  disabled={isSaving}
                  onChange={(event) => updateDraft({ name: event.currentTarget.value })}
                />
                <Select
                  label={t("common.table.status", "Stato")}
                  value={draft.status}
                  disabled={isSaving}
                  onChange={(event) =>
                    updateDraft({ status: event.currentTarget.value as EmailTemplateStatus })
                  }
                >
                  <option value="active">{t("common.status.active", "active")}</option>
                  <option value="disabled">{t("common.status.disabled", "disabled")}</option>
                </Select>
              </div>
              <Input
                label={t("settings.email_templates.subject", "Oggetto email")}
                value={draft.subject}
                disabled={isSaving}
                onChange={(event) => updateDraft({ subject: event.currentTarget.value })}
              />
            </FormSection>

            <FormSection
              headingLevel={3}
              variant="plain"
              title={t("settings.email_templates.content_title", "Contenuto")}
              description={t(
                "settings.email_templates.content_hint",
                "Scrivi la versione testuale. Usa HTML avanzato solo quando serve controllare markup e stile."
              )}
            >
              <Textarea
                label={t("settings.email_templates.text_body", "Testo email")}
                rows={12}
                value={draft.textBody}
                disabled={isSaving}
                className="font-mono text-sm leading-6"
                onChange={(event) => updateDraft({ textBody: event.currentTarget.value })}
              />

              {variableNames.length ? (
                <div className="grid gap-2 border-t border-[color:var(--color-border)] pt-3">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
                    {t("settings.email_templates.available_variables", "Variabili disponibili")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {variableNames.map((variable) => (
                      <code
                        key={variable}
                        className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-xs text-[color:var(--color-ink-muted)]"
                      >
                        {`{{${variable}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              ) : null}

              <Disclosure
                summary={t("settings.email_templates.advanced_html", "HTML avanzato")}
                contentClassName="grid gap-3"
              >
                <Textarea
                  label={t("settings.email_templates.html_body", "HTML")}
                  hint={t(
                    "settings.email_templates.html_hint",
                    "Puoi inserire markup, classi CSS, tag <style> e stili inline. La preview HTML usa questo draft."
                  )}
                  rows={14}
                  value={draft.htmlBody}
                  disabled={isSaving}
                  className="font-mono text-sm leading-6"
                  onChange={(event) => updateDraft({ htmlBody: event.currentTarget.value })}
                />
              </Disclosure>
            </FormSection>

            <Disclosure
              summary={t("settings.email_templates.template_settings", "Impostazioni template")}
              contentClassName="grid gap-4 md:grid-cols-2"
            >
              <Input
                label={t("settings.email_templates.key", "Chiave")}
                value={draft.key}
                readOnly
                onChange={() => undefined}
              />
              <Input
                label={t("settings.email_templates.locale", "Locale")}
                value={draft.locale}
                disabled={isSaving}
                onChange={(event) => updateDraft({ locale: event.currentTarget.value })}
              />
              <div className="md:col-span-2">
                <Input
                  label={t("settings.email_templates.description", "Descrizione")}
                  value={draft.description}
                  disabled={isSaving}
                  onChange={(event) => updateDraft({ description: event.currentTarget.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label={t("settings.email_templates.variables", "Variabili")}
                  hint={t(
                    "settings.email_templates.variables_hint",
                    "Lista separata da virgole usata per preview e validazione."
                  )}
                  value={draft.variablesText}
                  disabled={isSaving}
                  onChange={(event) => updateDraft({ variablesText: event.currentTarget.value })}
                />
              </div>
            </Disclosure>
          </div>

          <aside className="min-h-0 xl:sticky xl:top-5 xl:self-start">
            <Panel as="section" className="overflow-hidden p-0">
              <div className="border-b border-[color:var(--color-border)] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
                  {t("settings.email_templates.preview_title", "Anteprima mail")}
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-[color:var(--color-ink)]">
                  {localPreview?.subject}
                </p>
              </div>
              <div className="p-3">
                <Tabs
                  ariaLabel={t("settings.email_templates.preview_mode", "Formato anteprima")}
                  items={[
                    { value: "html", label: "HTML" },
                    {
                      value: "text",
                      label: t("settings.email_templates.text_body", "Testo")
                    }
                  ]}
                  value={previewMode}
                  panelClassName="pt-3"
                  onValueChange={(value) => setPreviewMode(value as EmailPreviewMode)}
                >
                  {previewMode === "html" ? (
                    <iframe
                      title={t("settings.email_templates.preview_title", "Anteprima mail")}
                      sandbox=""
                      srcDoc={previewDocument}
                      className="h-[600px] w-full rounded-[var(--radius-sm)] bg-white"
                    />
                  ) : (
                    <pre className="min-h-[480px] whitespace-pre-wrap break-words rounded-[var(--radius-sm)] bg-[color:var(--color-panel-soft)] p-5 text-sm leading-6 text-[color:var(--color-ink)]">
                      {localPreview?.text}
                    </pre>
                  )}
                </Tabs>
              </div>
            </Panel>
          </aside>
        </div>
      </SettingsSectionLayout>

      <Dialog
        open={pendingTemplateId !== null}
        onClose={() => setPendingTemplateId(null)}
        title={t("settings.unsaved.title", "Modifiche non salvate")}
        description={t(
          "settings.email_templates.unsaved_summary",
          "Scarta le modifiche per aprire un altro template."
        )}
        width="md"
        variant="modal"
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setPendingTemplateId(null)}>
            {t("common.actions.cancel", "Annulla")}
          </Button>
          <Button type="button" onClick={discardDraftAndSelectTemplate}>
            {t("common.actions.discard", "Scarta modifiche")}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

function toDraft(template: EmailTemplateRecord): EmailTemplateDraft {
  return {
    key: template.key,
    locale: template.locale,
    name: template.name,
    description: template.description ?? "",
    subject: template.subject,
    textBody: template.textBody,
    htmlBody: template.htmlBody ?? "",
    variablesText: template.variables.join(", "),
    status: template.status === "disabled" ? "disabled" : "active"
  };
}

function parseVariables(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createPreviewVariables(variables: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    variables.map((key) => [
      key,
      key.toLowerCase().includes("url")
        ? "https://example.test/link"
        : key.toLowerCase().includes("name")
          ? "Mario Rossi"
          : key.toLowerCase().includes("site")
            ? "Trinacria CMS"
            : key.toLowerCase().includes("expires")
              ? "31/12/2026 18:00"
              : key
    ])
  );
}

function renderDraftPreview(
  draft: EmailTemplateDraft,
  variables: Record<string, string>
): EmailTemplatePreview {
  return {
    subject: renderTemplateString(draft.subject, variables),
    text: renderTemplateString(draft.textBody, variables),
    ...(draft.htmlBody.trim() ? { html: renderTemplateString(draft.htmlBody, variables) } : {})
  };
}

function renderTemplateString(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    return variables[key] ?? `{{${key}}}`;
  });
}

function createPreviewDocument(htmlBody: string | undefined, textBody: string): string {
  const body = htmlBody?.trim()
    ? htmlBody
    : `<pre style="margin:0;white-space:pre-wrap;font:inherit;">${escapeHtml(textBody)}</pre>`;
  return [
    "<!doctype html>",
    '<html lang="it">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    "<style>",
    "body{margin:0;background:#f3f4f6;color:#111827;font-family:Inter,Arial,sans-serif;line-height:1.5;}",
    ".email-shell{max-width:680px;margin:0 auto;padding:32px 20px;}",
    ".email-content{background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:28px;}",
    "a{color:#2563eb;}",
    "img{max-width:100%;height:auto;}",
    "</style>",
    "</head>",
    "<body>",
    '<main class="email-shell"><div class="email-content">',
    body,
    "</div></main>",
    "</body>",
    "</html>"
  ].join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function upsertTemplateRecord(
  current: readonly EmailTemplateRecord[],
  next: EmailTemplateRecord
): readonly EmailTemplateRecord[] {
  const found = current.some((item) => item.id === next.id);
  if (!found) return [next, ...current];
  return current.map((item) => (item.id === next.id ? next : item));
}

function toDisplayError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unexpected error";
}
