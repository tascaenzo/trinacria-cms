import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableHeaderRow,
  DataTablePrimaryCell,
  DataTableRow,
  DataTableTable,
  Input,
  Select,
  Textarea
} from "@trinacria-cms/trinacria-ui";
import { ErrorBanner, EmptyState } from "../../../components/resource-feedback.js";
import type { TranslateFn } from "../../../lib/i18n.js";
import { toDisplayError } from "../../../lib/sdk-errors.js";
import { cms } from "../../../runtime/cms-sdk.js";

type EmailTemplateRecord = Awaited<ReturnType<typeof cms.email.listEmailTemplates>>["data"][number];
type EmailTemplateStatus = "active" | "disabled";

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

export function EmailTemplateManager({ t }: { t: TranslateFn }) {
  const [templates, setTemplates] = useState<readonly EmailTemplateRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmailTemplateDraft | null>(null);
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

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

      <div className="min-h-0 overflow-auto px-6 py-5 sm:px-8">
        <div className="mx-auto grid max-w-5xl gap-5">
          <div className="border-b border-[color:var(--color-border)] pb-4">
            <h3 className="text-xl font-semibold text-[color:var(--color-ink)]">{draft.name}</h3>
          </div>

          {error ? <ErrorBanner message={error} /> : null}
          {message ? (
            <p className="text-sm font-medium text-[color:var(--color-success-ink)]">{message}</p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
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
            <Input
              label={t("settings.email_templates.name", "Nome")}
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
                label={t("settings.email_templates.subject", "Oggetto")}
                value={draft.subject}
                readOnly={isSaving}
                onChange={(event) => updateDraft({ subject: event.currentTarget.value })}
              />
            </div>
            <Textarea
              label={t("settings.email_templates.text_body", "Testo")}
              value={draft.textBody}
              readOnly={isSaving}
              onChange={(event) => updateDraft({ textBody: event.currentTarget.value })}
            />
            <Textarea
              label={t("settings.email_templates.html_body", "HTML")}
              value={draft.htmlBody}
              readOnly={isSaving}
              onChange={(event) => updateDraft({ htmlBody: event.currentTarget.value })}
            />
            <div className="md:col-span-2">
              <Input
                label={t("settings.email_templates.variables", "Variabili")}
                hint={t(
                  "settings.email_templates.variables_hint",
                  "Lista separata da virgole usata per preview e validazione."
                )}
                value={draft.variablesText}
                readOnly={isSaving}
                onChange={(event) => updateDraft({ variablesText: event.currentTarget.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[color:var(--color-border)] pt-4">
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
                : t("common.actions.preview", "Preview")}
            </Button>
            <Button type="button" disabled={isSaving} onClick={() => void saveTemplate()}>
              {isSaving
                ? t("common.actions.saving", "Salvataggio...")
                : t("common.actions.save", "Salva")}
            </Button>
          </div>

          {preview ? (
            <DataTable>
              <DataTableTable>
                <DataTableHead>
                  <DataTableHeaderRow>
                    <DataTableHeadCell>
                      {t("settings.email_templates.preview_field", "Campo")}
                    </DataTableHeadCell>
                    <DataTableHeadCell>
                      {t("settings.email_templates.preview_value", "Valore")}
                    </DataTableHeadCell>
                  </DataTableHeaderRow>
                </DataTableHead>
                <DataTableBody>
                  <DataTableRow>
                    <DataTablePrimaryCell>subject</DataTablePrimaryCell>
                    <DataTableCell>{preview.subject}</DataTableCell>
                  </DataTableRow>
                  <DataTableRow>
                    <DataTablePrimaryCell>text</DataTablePrimaryCell>
                    <DataTableCell className="whitespace-pre-wrap">{preview.text}</DataTableCell>
                  </DataTableRow>
                  {preview.html ? (
                    <DataTableRow>
                      <DataTablePrimaryCell>html</DataTablePrimaryCell>
                      <DataTableCell className="whitespace-pre-wrap">{preview.html}</DataTableCell>
                    </DataTableRow>
                  ) : null}
                </DataTableBody>
              </DataTableTable>
            </DataTable>
          ) : null}
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
      key.toLowerCase().includes("url") ? "https://example.test/link" : key
    ])
  );
}

function upsertTemplateRecord(
  current: readonly EmailTemplateRecord[],
  next: EmailTemplateRecord
): readonly EmailTemplateRecord[] {
  const found = current.some((item) => item.id === next.id);
  if (!found) return [next, ...current];
  return current.map((item) => (item.id === next.id ? next : item));
}
