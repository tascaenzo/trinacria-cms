import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuItem,
  IconButton,
  JsonViewDialog,
  Panel,
  PropertyItem,
  PropertyList
} from "@trinacria-cms/trinacria-ui";
import { type ReactNode, useState } from "react";
import type { AdminResourceDefinition, AdminResourceFieldDefinition } from "../../contracts.js";
import { formatDateTime } from "../../lib/formatting.js";
import type { TranslateFn } from "../../lib/i18n.js";
import { translateStatusLabel } from "../../lib/ui-translations.js";
import type { DeclarativeAction, DeclarativeActionContext } from "../types.js";
import { isDeclarativeActionVisibleForRecord } from "../utils/action-visibility.js";
import { formatCellValue } from "../utils/formatting.js";
import { readObjectPath } from "../utils/object-path.js";

const IDENTITY_DETAIL_FIELDS = [
  { key: "id", labelKey: "common.table.id", fallbackLabel: "ID" },
  { key: "key", labelKey: "common.table.key", fallbackLabel: "Key" },
  { key: "slug", labelKey: "common.table.slug", fallbackLabel: "Slug" }
] as const;

const DETAIL_TAG_PREVIEW_LIMIT = 12;

export function DeclarativeResourceDetail({
  onBack,
  onPrepareAction,
  record,
  resource,
  t
}: {
  onBack: () => void;
  onPrepareAction?: (action: DeclarativeAction, context?: DeclarativeActionContext) => void;
  record: unknown;
  resource: AdminResourceDefinition;
  t: TranslateFn;
}) {
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const recordActions =
    resource.actions
      ?.filter((action) => action.intent !== "create")
      .filter((action) => isDeclarativeActionVisibleForRecord(action, record)) ?? [];
  const detail = resource.detail && typeof resource.detail === "object" ? resource.detail : {};
  const fieldMap = new Map((resource.fields ?? []).map((field) => [field.key, field]));
  const titleField = detail.titleField ?? resource.fields?.find((field) => field.primary)?.key;
  const subtitleField =
    detail.subtitleField ?? resource.fields?.find((field) => field.key !== titleField)?.key;
  const sectionFields = detail.sections?.flatMap((section) => section.fields ?? []) ?? [];
  const configuredFields = detail.fields ?? sectionFields;
  const title = buildDetailTitle(record, [titleField, subtitleField], fieldMap, resource.title, t);
  const fields = withIdentityFields(
    resolveDetailFields(configuredFields, resource.fields ?? [], fieldMap),
    record,
    t
  );
  const showJson = detail.showJson !== false;

  return (
    <>
      <Panel
        className="overflow-hidden border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-0"
        radius="lg"
      >
        <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[inset_0_-1px_0_var(--color-border)]">
          <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:py-4">
            <div className="flex min-w-0 items-start gap-3">
              <IconButton
                icon="chevron-left"
                label={t("common.actions.back", "Back")}
                size="sm"
                variant="ghost"
                onClick={onBack}
              />
              <div className="grid min-w-0 gap-1">
                <h2 className="break-words text-sm font-semibold leading-6 text-[color:var(--color-ink)]">
                  {title}
                </h2>
                <span className="text-xs font-medium leading-5 text-[color:var(--color-ink-muted)]">
                  {detail.title ?? resource.title}
                </span>
              </div>
            </div>
            {showJson || recordActions.length ? (
              <div className="flex w-full justify-end border-t border-[color:var(--color-border)] pt-3 md:ml-auto md:w-auto md:border-t-0 md:pt-0">
                <DropdownMenu
                  trigger={
                    <Button type="button" variant="secondary" size="sm">
                      {t("common.actions.menu", "Actions")}
                    </Button>
                  }
                  contentClassName="min-w-[220px]"
                >
                  {showJson ? (
                    <DropdownMenuItem
                      icon="file-json"
                      title={t("common.actions.inspect_json", "Inspect JSON")}
                      onClick={() => setIsJsonOpen(true)}
                    />
                  ) : null}
                  {recordActions.map((action) => (
                    <DropdownMenuItem
                      key={action.id}
                      icon={getActionIcon(action.intent)}
                      title={action.title}
                      tone={action.intent === "delete" ? "danger" : "neutral"}
                      onClick={() => onPrepareAction?.(action, { record })}
                    />
                  ))}
                </DropdownMenu>
              </div>
            ) : null}
          </div>
        </header>
        <PropertyList variant="key-value">
          {fields.map((field) => (
            <PropertyItem
              key={field.key}
              label={field.label}
              value={formatDetailFieldValue(record, field, t)}
            />
          ))}
        </PropertyList>
      </Panel>

      {showJson ? (
        <JsonViewDialog
          open={isJsonOpen}
          onClose={() => setIsJsonOpen(false)}
          closeLabel={t("common.actions.close", "Close")}
          title={t("common.json.row_title", "Row JSON")}
          description={t("common.json.row_description", "Open the raw row payload.")}
          payloadTitle={t("common.json.row_payload", "Row payload")}
          value={record}
          variant="drawer"
          width="lg"
        />
      ) : null}
    </>
  );
}

function resolveDetailFields(
  keys: readonly string[] | undefined,
  fields: readonly AdminResourceFieldDefinition[],
  fieldMap: ReadonlyMap<string, AdminResourceFieldDefinition>
) {
  if (!keys?.length) {
    return fields;
  }
  return keys
    .map((key) => fieldMap.get(key))
    .filter((field): field is AdminResourceFieldDefinition => Boolean(field));
}

function withIdentityFields(
  fields: readonly AdminResourceFieldDefinition[],
  record: unknown,
  t: TranslateFn
): readonly AdminResourceFieldDefinition[] {
  const existingKeys = new Set(fields.map((field) => field.key));
  const identityFields = IDENTITY_DETAIL_FIELDS.filter(({ key }) => {
    const value = readObjectPath(record, key);
    return !existingKeys.has(key) && (typeof value === "string" || typeof value === "number");
  }).map(({ key, labelKey, fallbackLabel }) => ({
    key,
    label: t(labelKey, fallbackLabel),
    kind: "text" as const
  }));

  return identityFields.length ? [...identityFields, ...fields] : fields;
}

function formatDetailFieldValue(
  record: unknown,
  field: AdminResourceFieldDefinition,
  t: TranslateFn
): ReactNode {
  const rawValue = readObjectPath(record, field.key);
  if (field.kind === "status") {
    return (
      <Badge tone={rawValue === "active" ? "success" : "neutral"}>
        {typeof rawValue === "string"
          ? translateStatusLabel(rawValue, t)
          : formatCellValue(rawValue)}
      </Badge>
    );
  }
  if (field.kind === "datetime" && typeof rawValue === "string") {
    return formatDateTime(rawValue);
  }
  if (field.kind === "tags") {
    return <TagList value={rawValue} limit={DETAIL_TAG_PREVIEW_LIMIT} />;
  }
  return formatCellValue(rawValue);
}

function buildDetailTitle(
  record: unknown,
  keys: Array<string | undefined>,
  fieldMap: ReadonlyMap<string, AdminResourceFieldDefinition>,
  fallback: string,
  t: TranslateFn
): string {
  const parts = keys
    .map((key) => (key ? fieldMap.get(key) : undefined))
    .filter((field): field is AdminResourceFieldDefinition => Boolean(field))
    .map((field) => formatDetailTitlePart(record, field, t))
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : fallback;
}

function formatDetailTitlePart(
  record: unknown,
  field: AdminResourceFieldDefinition,
  t: TranslateFn
): string {
  const value = formatDetailFieldValue(record, field, t);
  return typeof value === "string" ? value : formatCellValue(readObjectPath(record, field.key));
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
    <div className="flex flex-wrap gap-1.5">
      {visibleTags.map((tag) => (
        <Badge
          key={tag}
          tone="neutral"
          title={tag}
          className="max-w-[24rem] whitespace-normal break-all text-left font-mono leading-4"
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
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? "-" : `+${hiddenCount}`}
        </Button>
      ) : null}
    </div>
  );
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

function getActionIcon(intent: string) {
  if (intent === "update") {
    return "pencil" as const;
  }
  if (intent === "delete") {
    return "trash-2" as const;
  }
  return "more-horizontal" as const;
}
