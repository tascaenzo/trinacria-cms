import { Button } from "@trinacria-cms/trinacria-ui";
import type { ContentTypeField } from "../editorial-admin.types.js";

export function ContentTypeFieldList({
  fields,
  empty,
  onRemove
}: {
  fields: readonly ContentTypeField[];
  empty: string;
  onRemove: (key: string) => void;
}) {
  if (!fields.length)
    return (
      <p className="rounded-lg bg-[color:var(--color-surface-subtle)] p-3 text-sm text-[color:var(--color-ink-muted)]">
        {empty}
      </p>
    );
  return (
    <ul className="grid gap-2">
      {fields.map((field) => (
        <li
          key={field.key}
          className="flex items-start gap-4 rounded-lg bg-[color:var(--color-surface-subtle)] px-4 py-3.5"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[color:var(--color-ink)]">
                {field.label}
              </span>
              <FieldBadge>{fieldTypeLabel(field.type)}</FieldBadge>
              {field.required ? <FieldBadge>Obbligatorio</FieldBadge> : null}
              {field.multiple ? <FieldBadge>Più valori</FieldBadge> : null}
            </span>
            <span className="mt-1 block font-mono text-xs text-[color:var(--color-ink-subtle)]">
              {field.key}
            </span>
            {field.config?.options?.length ? (
              <span className="mt-2 block text-sm text-[color:var(--color-ink-muted)]">
                {field.config.options.length} voci disponibili
              </span>
            ) : null}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(field.key)}>
            Rimuovi
          </Button>
        </li>
      ))}
    </ul>
  );
}

function FieldBadge({ children }: { children: string }) {
  return (
    <span className="rounded bg-[color:var(--color-surface-subtle)] px-1.5 py-0.5 text-xs font-medium text-[color:var(--color-ink-muted)]">
      {children}
    </span>
  );
}

function fieldTypeLabel(type: ContentTypeField["type"]) {
  const labels: Record<ContentTypeField["type"], string> = {
    text: "Testo",
    rich_text: "Testo ricco",
    number: "Numero",
    boolean: "Sì / No",
    date_time: "Data e ora",
    select: "Scelta",
    url: "URL",
    media: "Media"
  };
  return labels[type];
}
