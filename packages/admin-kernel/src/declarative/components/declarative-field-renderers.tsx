import { Badge, Button } from "@trinacria-cms/trinacria-ui";
import { useState } from "react";
import type { AdminResourceDefinition } from "../../contracts.js";
import { formatDateTime } from "../../lib/formatting.js";
import type { TranslateFn } from "../../lib/i18n.js";
import { translateStatusLabel } from "../../lib/ui-translations.js";
import { formatCellValue, formatFieldPreview } from "../utils/formatting.js";
import { readObjectPath } from "../utils/object-path.js";

const TABLE_TAG_PREVIEW_LIMIT = 3;

type ResourceField = NonNullable<AdminResourceDefinition["fields"]>[number];

export function formatDeclarativeFieldValue(record: unknown, field: ResourceField, t: TranslateFn) {
  if (!record) {
    return formatFieldPreview(field);
  }

  const rawValue = readObjectPath(record, field.key);
  if (field.kind === "status") {
    return (
      <Badge tone={readDeclarativeStatusTone(record, field)}>
        {readDeclarativeStatusLabel(record, field, t)}
      </Badge>
    );
  }
  if (field.kind === "datetime") {
    return (
      <span className="text-[color:var(--color-ink-muted)]">
        {typeof rawValue === "string" ? formatDateTime(rawValue) : formatCellValue(rawValue)}
      </span>
    );
  }
  if (field.kind === "tags") {
    return <TagList value={rawValue} limit={TABLE_TAG_PREVIEW_LIMIT} />;
  }
  return formatCellValue(rawValue);
}

export function readDeclarativeFieldValue(
  record: unknown,
  field: ResourceField | undefined
): string {
  if (!field) {
    return "";
  }
  if (!record) {
    return formatFieldPreview(field);
  }
  const value = readObjectPath(record, field.key);
  if (field.kind === "datetime" && typeof value === "string") {
    return formatDateTime(value);
  }
  if (field.kind === "tags") {
    return formatTagText(value);
  }
  return formatCellValue(value);
}

export function readDeclarativeStatusLabel(
  record: unknown,
  field: ResourceField,
  t: TranslateFn
): string {
  if (!record) {
    return translateStatusLabel("active", t);
  }
  const value = readObjectPath(record, field.key);
  return translateStatusLabel(typeof value === "string" ? value : String(value ?? ""), t);
}

export function readDeclarativeStatusTone(
  record: unknown,
  field: ResourceField
): "success" | "warning" {
  if (!record) {
    return "success";
  }
  return readObjectPath(record, field.key) === "active" ? "success" : "warning";
}

function TagList({ value, limit }: { value: unknown; limit: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const tags = normalizeTagValues(value);
  if (tags.length === 0) {
    return <span className="text-[color:var(--color-ink-muted)]">-</span>;
  }

  const visibleTags = isExpanded ? tags : tags.slice(0, limit);
  const hiddenCount = tags.length - visibleTags.length;
  const canToggle = tags.length > limit;

  return (
    <div className="flex max-w-[34rem] flex-wrap gap-1.5">
      {visibleTags.map((tag) => (
        <Badge
          key={tag}
          tone="neutral"
          title={tag}
          className="max-w-[18rem] whitespace-normal break-all text-left font-mono leading-4"
        >
          {tag}
        </Badge>
      ))}
      {canToggle ? (
        <Button
          type="button"
          aria-label={isExpanded ? "Collapse tags" : "Show all tags"}
          title={isExpanded ? "Collapse tags" : tags.slice(limit).join(", ")}
          size="sm"
          variant="outline"
          className={
            isExpanded
              ? "h-6 w-6 rounded-full border-[color:var(--color-accent-border)] bg-[color:var(--color-accent-soft)] p-0 text-xs text-[color:var(--color-accent-ink)]"
              : "h-6 rounded-[var(--radius-badge)] border-[color:var(--color-neutral-border)] bg-[color:var(--color-neutral-bg)] px-2 py-0.5 text-xs text-[color:var(--color-neutral-ink)]"
          }
          onClick={(event) => {
            event.stopPropagation();
            setIsExpanded((current) => !current);
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {isExpanded ? "-" : `+${hiddenCount}`}
        </Button>
      ) : null}
    </div>
  );
}

function formatTagText(value: unknown): string {
  const tags = normalizeTagValues(value);
  if (tags.length === 0) {
    return "-";
  }
  return tags.join(", ");
}

function normalizeTagValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return typeof value === "string" && value.trim() ? [value.trim()] : [];
  }
  return value
    .map((item) => {
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
        return String(item).trim();
      }
      return "";
    })
    .filter(Boolean);
}
