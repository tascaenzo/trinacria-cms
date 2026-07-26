import { Button, Icon, Input, Select, Switch, Textarea } from "@trinacria-cms/trinacria-ui";
import { useCallback, useEffect, useState } from "react";
import type {
  CmsClient,
  ContentTypeField,
  EditorialContentType,
  EditorialEntryRecord,
  EditorialNavigator
} from "./editorial-admin.types.js";
import { toEditorialDisplayError } from "./lib/editorial-admin-errors.js";

const NAVIGATION_EVENT = "trinacria-cms:backoffice-navigation";

interface EntryDraft {
  title: string;
  slug: string;
  body: string;
  data: Record<string, unknown>;
  reviewerUserId: string;
  scheduledAt: string;
}

const EMPTY_DRAFT: EntryDraft = {
  title: "",
  slug: "",
  body: "",
  data: {},
  reviewerUserId: "",
  scheduledAt: ""
};

export interface EditorialEntryDetailPageContext {
  cms: CmsClient;
  navigateToRoute?: EditorialNavigator;
}

/** Working surface for writers; model fields are rendered dynamically. */
export function EditorialEntryDetailPage({
  cms,
  navigateToRoute
}: EditorialEntryDetailPageContext) {
  const entryId = useRouteEntryId();
  const [entry, setEntry] = useState<EditorialEntryRecord | null>(null);
  const [contentType, setContentType] = useState<EditorialContentType | null>(null);
  const [draft, setDraft] = useState<EntryDraft>(EMPTY_DRAFT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const updateDraft = (next: Partial<EntryDraft>) =>
    setDraft((current) => ({ ...current, ...next }));

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
      setEntry(entryResponse.data);
      setContentType(modelResponse.data);
      setDraft(toEntryDraft(entryResponse.data));
    } catch (currentError) {
      setEntry(null);
      setContentType(null);
      setError(
        toEditorialDisplayError(currentError, "Non è stato possibile caricare il contenuto.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [cms, entryId]);

  useEffect(() => void load(), [load]);

  const save = async () => {
    if (!entry || !contentType) return;
    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);
      const response = await cms.request<{ data: EditorialEntryRecord }>({
        method: "PATCH",
        path: `/v1/editorial/entries/${entry.id}`,
        body: toUpdatePayload(entry, draft)
      });
      setEntry(response.data);
      setDraft(toEntryDraft(response.data));
      setMessage("Modifiche salvate.");
    } catch (currentError) {
      setError(
        toEditorialDisplayError(currentError, "Non è stato possibile salvare il contenuto.")
      );
    } finally {
      setIsSaving(false);
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
            <h2 className="text-base font-semibold text-[color:var(--color-ink)]">Contenuto</h2>
            <div className="mt-4 grid gap-4">
              <Input
                label="Titolo"
                value={draft.title}
                readOnly={isSaving}
                onChange={(event) => updateDraft({ title: event.currentTarget.value })}
              />
              <Input
                label="Slug"
                value={draft.slug}
                readOnly={isSaving}
                onChange={(event) => updateDraft({ slug: event.currentTarget.value })}
              />
              <Textarea
                label="Corpo"
                rows={entry.body ? 14 : 9}
                value={draft.body}
                readOnly={isSaving}
                onChange={(event) => updateDraft({ body: event.currentTarget.value })}
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
          <h2 className="text-base font-semibold text-[color:var(--color-ink)]">Pianificazione</h2>
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
            <p className="rounded-lg bg-[color:var(--color-surface-subtle)] p-3 text-xs text-[color:var(--color-ink-muted)]">
              Stato corrente: <strong>{entry.status}</strong>. Salva prima di eseguire una
              transizione dal desk.
            </p>
          </div>
        </aside>
      </div>
    </main>
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

function toEntryDraft(entry: EditorialEntryRecord): EntryDraft {
  const textBody = entry.body?.text;
  return {
    title: entry.title ?? "",
    slug: entry.slug ?? "",
    body:
      typeof textBody === "string"
        ? textBody
        : entry.body
          ? JSON.stringify(entry.body, null, 2)
          : "",
    data: entry.data ?? {},
    reviewerUserId: entry.reviewerUserId ?? "",
    scheduledAt: toDateTimeLocal(entry.scheduledAt)
  };
}

function toUpdatePayload(entry: EditorialEntryRecord, draft: EntryDraft) {
  return {
    ...(draft.title.trim() ? { title: draft.title.trim() } : { clearTitle: true }),
    ...(draft.slug.trim() ? { slug: slugify(draft.slug) } : { clearSlug: true }),
    ...(draft.body.trim() ? { body: { text: draft.body.trim() } } : { clearBody: true }),
    data: draft.data,
    ...(draft.reviewerUserId.trim()
      ? { reviewerUserId: draft.reviewerUserId.trim() }
      : { clearReviewer: true }),
    ...(draft.scheduledAt
      ? { scheduledAt: new Date(draft.scheduledAt).toISOString() }
      : { clearScheduledAt: true }),
    ...(entry.version ? { expectedVersion: entry.version } : {})
  };
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

function slugify(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toDateTimeLocal(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
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
