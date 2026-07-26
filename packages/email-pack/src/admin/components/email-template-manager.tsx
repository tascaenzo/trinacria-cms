import type { createCmsSdkClient, EmailApi } from "@trinacria-cms/sdk";
import { Badge, Button, Input, Select, Textarea } from "@trinacria-cms/trinacria-ui";
import { useEffect, useMemo, useState } from "react";

type CmsClient = ReturnType<typeof createCmsSdkClient>;
type EmailTemplateRecord = Awaited<ReturnType<EmailApi["listEmailTemplates"]>>["data"][number];
type EmailTemplateStatus = "active" | "disabled";
type EmailPreviewMode = "html" | "text";

export interface EmailTemplateManagerContext {
  cms: CmsClient & {
    email: EmailApi;
  };
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

export function EmailTemplateManager({ cms, t }: EmailTemplateManagerContext) {
  const [templates, setTemplates] = useState<readonly EmailTemplateRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmailTemplateDraft | null>(null);
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewMode, setPreviewMode] = useState<EmailPreviewMode>("html");

  useEffect(() => {
    void loadTemplates();
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? templates[0] ?? null,
    [selectedId, templates]
  );

  useEffect(() => {
    if (selectedTemplate) {
      setDraft(toDraft(selectedTemplate));
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
      setMessage(null);
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
      setMessage(t("settings.email_templates.saved", "Template salvato."));
    } catch (currentError) {
      setError(toDisplayError(currentError));
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
    setMessage(null);
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

  if (isLoading) {
    return <EmptyState text={t("settings.email_templates.loading", "Caricamento template...")} />;
  }

  if (!draft) {
    return (
      <section className="p-6">
        {error ? <ErrorBanner message={error} /> : null}
        <EmptyState text={t("settings.email_templates.empty", "Nessun template email trovato.")} />
      </section>
    );
  }

  return (
    <section className="grid h-full min-h-0 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-auto border-b border-[color:var(--color-border)] bg-white lg:border-b-0 lg:border-r">
        <div className="px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
            {t("settings.email_templates.title", "Template email")}
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {templates.length} {t("settings.email_templates.count_label", "template")}
          </p>
        </div>
        <div className="grid gap-1 px-6 py-4">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedId(template.id)}
              className={`grid min-h-16 gap-1 rounded-lg border px-3 py-2 text-left transition ${
                template.id === selectedTemplate?.id
                  ? "border-[color:var(--color-border-strong)] bg-white text-[color:var(--color-ink)]"
                  : "border-transparent text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-border)] hover:bg-white hover:text-[color:var(--color-ink)]"
              }`}
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
            </button>
          ))}
        </div>
      </aside>

      <div className="min-h-0 overflow-auto px-5 py-5 sm:px-7">
        <div className="mx-auto grid max-w-7xl gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--color-border)] pb-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
                {t("settings.email_templates.editor_title", "Editor template")}
              </p>
              <h3 className="mt-1 truncate text-xl font-semibold text-[color:var(--color-ink)]">
                {draft.name}
              </h3>
              <p className="mt-1 truncate text-sm text-[color:var(--color-ink-muted)]">
                {draft.key} · {draft.locale}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => void loadTemplates()}>
                {t("common.actions.refresh", "Aggiorna")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isPreviewing || isSaving}
                onClick={() => void previewTemplate()}
              >
                {isPreviewing
                  ? t("settings.email_templates.previewing", "Preview...")
                  : t("settings.email_templates.validate_saved", "Valida salvato")}
              </Button>
              <Button type="button" disabled={isSaving} onClick={() => void saveTemplate()}>
                {isSaving
                  ? t("common.actions.saving", "Salvataggio...")
                  : t("common.actions.save", "Salva")}
              </Button>
            </div>
          </div>

          {error ? <ErrorBanner message={error} /> : null}
          {message ? (
            <p className="text-sm font-medium text-[color:var(--color-success-ink)]">{message}</p>
          ) : null}
          {preview ? (
            <p className="text-sm text-[color:var(--color-success-ink)]">
              {t(
                "settings.email_templates.server_preview_ok",
                "Validazione backend completata: il template salvato renderizza correttamente."
              )}
            </p>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
            <div className="grid content-start gap-5">
              <section className="grid gap-4 rounded-lg border border-[color:var(--color-border)] bg-white p-4">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <Input
                    label={t("settings.email_templates.name", "Nome template")}
                    value={draft.name}
                    readOnly={isSaving}
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
                  readOnly={isSaving}
                  onChange={(event) => updateDraft({ subject: event.currentTarget.value })}
                />
              </section>

              <section className="grid gap-4 rounded-lg border border-[color:var(--color-border)] bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                    {t("settings.email_templates.content_title", "Contenuto")}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
                    {t(
                      "settings.email_templates.content_hint",
                      "Scrivi la versione testuale. Usa HTML avanzato solo quando serve controllare markup e stile."
                    )}
                  </p>
                </div>
                <Textarea
                  label={t("settings.email_templates.text_body", "Testo email")}
                  rows={12}
                  value={draft.textBody}
                  readOnly={isSaving}
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

                <details className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[color:var(--color-ink)]">
                    {t("settings.email_templates.advanced_html", "HTML avanzato")}
                  </summary>
                  <div className="grid gap-3 border-t border-[color:var(--color-border)] bg-white p-4">
                    <Textarea
                      label={t("settings.email_templates.html_body", "HTML")}
                      hint={t(
                        "settings.email_templates.html_hint",
                        "Puoi inserire markup, classi CSS, tag <style> e stili inline. La preview HTML usa questo draft."
                      )}
                      rows={14}
                      value={draft.htmlBody}
                      readOnly={isSaving}
                      className="font-mono text-sm leading-6"
                      onChange={(event) => updateDraft({ htmlBody: event.currentTarget.value })}
                    />
                  </div>
                </details>
              </section>

              <details className="rounded-lg border border-[color:var(--color-border)] bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[color:var(--color-ink)]">
                  {t("settings.email_templates.template_settings", "Impostazioni template")}
                </summary>
                <div className="grid gap-4 border-t border-[color:var(--color-border)] p-4 md:grid-cols-2">
                  <Input
                    label={t("settings.email_templates.key", "Chiave")}
                    value={draft.key}
                    readOnly
                    onChange={() => undefined}
                  />
                  <Input
                    label={t("settings.email_templates.locale", "Locale")}
                    value={draft.locale}
                    readOnly={isSaving}
                    onChange={(event) => updateDraft({ locale: event.currentTarget.value })}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label={t("settings.email_templates.description", "Descrizione")}
                      value={draft.description}
                      readOnly={isSaving}
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
                      readOnly={isSaving}
                      onChange={(event) =>
                        updateDraft({ variablesText: event.currentTarget.value })
                      }
                    />
                  </div>
                </div>
              </details>
            </div>

            <aside className="min-h-0 xl:sticky xl:top-5 xl:self-start">
              <section className="overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-white">
                <div className="grid gap-3 border-b border-[color:var(--color-border)] px-4 py-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
                      {t("settings.email_templates.preview_title", "Anteprima mail")}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-[color:var(--color-ink)]">
                      {localPreview?.subject}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={previewMode === "html" ? "primary" : "secondary"}
                      onClick={() => setPreviewMode("html")}
                    >
                      HTML
                    </Button>
                    <Button
                      type="button"
                      variant={previewMode === "text" ? "primary" : "secondary"}
                      onClick={() => setPreviewMode("text")}
                    >
                      {t("settings.email_templates.text_body", "Testo")}
                    </Button>
                  </div>
                </div>
                {previewMode === "html" ? (
                  <iframe
                    title={t("settings.email_templates.preview_title", "Anteprima mail")}
                    sandbox=""
                    srcDoc={previewDocument}
                    className="h-[640px] w-full bg-white"
                  />
                ) : (
                  <pre className="min-h-[520px] whitespace-pre-wrap break-words p-5 text-sm leading-6 text-[color:var(--color-ink)]">
                    {localPreview?.text}
                  </pre>
                )}
              </section>
            </aside>
          </div>
        </div>
      </div>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-8 text-center text-sm text-[color:var(--color-ink-muted)]">
      {text}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] px-4 py-3 text-sm text-[color:var(--color-danger-ink)]">
      {message}
    </div>
  );
}

function toDisplayError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unexpected error";
}
