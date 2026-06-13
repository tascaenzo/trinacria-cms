import { useMemo, useState } from "react";
import { Button } from "../../atoms/button/button.js";
import { Icon } from "../../atoms/icon/icon.js";
import { Dialog } from "../dialog/dialog.js";
import { Eyebrow } from "../../primitives/eyebrow/eyebrow.js";
import { cn } from "../../../utils/class-names.js";
import type { JsonViewDialogProps, JsonViewProps } from "./json-view.types.js";

type JsonPath = string;
type ExpandedState = Record<JsonPath, boolean>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExpandable(value: unknown) {
  return Array.isArray(value) || isRecord(value);
}

function getEntries(value: unknown): Array<[string, unknown]> {
  if (Array.isArray(value)) {
    return value.map((item, index) => [String(index), item]);
  }

  if (isRecord(value)) {
    return Object.entries(value);
  }

  return [];
}

function getValueLabel(value: unknown) {
  if (Array.isArray(value)) {
    return value.length === 1 ? "1 item" : `${value.length} items`;
  }

  if (isRecord(value)) {
    const size = Object.keys(value).length;
    return size === 1 ? "1 key" : `${size} keys`;
  }

  return "";
}

function getExpandablePaths(value: unknown, path = "$"): JsonPath[] {
  if (!isExpandable(value)) {
    return [];
  }

  return [
    path,
    ...getEntries(value).flatMap(([key, entryValue]) =>
      getExpandablePaths(entryValue, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`)
    )
  ];
}

function stringifyJson(value: unknown) {
  const seen = new WeakSet<object>();
  const json = JSON.stringify(
    value,
    (_key, nestedValue: unknown) => {
      if (typeof nestedValue === "bigint") {
        return nestedValue.toString();
      }

      if (typeof nestedValue === "function") {
        return `[Function ${nestedValue.name || "anonymous"}]`;
      }

      if (typeof nestedValue === "symbol") {
        return String(nestedValue);
      }

      if (typeof nestedValue === "object" && nestedValue !== null) {
        if (seen.has(nestedValue)) {
          return "[Circular]";
        }

        seen.add(nestedValue);
      }

      return nestedValue;
    },
    2
  );

  return json ?? String(value);
}

async function copyToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard API unavailable");
  }

  await navigator.clipboard.writeText(value);
}

function JsonPrimitive({ value }: { value: unknown }) {
  if (typeof value === "string") {
    return <span className="text-[color:var(--color-success-ink)]">{JSON.stringify(value)}</span>;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return <span className="text-[color:var(--color-warning-ink)]">{String(value)}</span>;
  }

  if (typeof value === "boolean") {
    return <span className="text-sky-400">{String(value)}</span>;
  }

  if (value === null) {
    return <span className="text-[color:var(--color-code-subtle)]">null</span>;
  }

  if (typeof value === "undefined") {
    return <span className="text-[color:var(--color-code-subtle)]">undefined</span>;
  }

  return <span className="text-[color:var(--color-code-muted)]">{String(value)}</span>;
}

function JsonNode({
  depth,
  expandedState,
  defaultExpandedDepth,
  label,
  onToggle,
  parentIsArray,
  path,
  value
}: {
  depth: number;
  defaultExpandedDepth: number;
  expandedState: ExpandedState;
  label?: string;
  onToggle: (path: JsonPath) => void;
  parentIsArray: boolean;
  path: JsonPath;
  value: unknown;
}) {
  const expandable = isExpandable(value);
  const entries = getEntries(value);
  const hasEntries = entries.length > 0;
  const isArray = Array.isArray(value);
  const isExpanded = expandedState[path] ?? depth < defaultExpandedDepth;
  const childIndentClass = depth === 0 ? "ml-4" : "ml-6";

  if (!expandable) {
    return (
      <div className="flex min-w-0 items-start gap-2 py-0.5">
        {label ? <JsonKey label={label} isArrayIndex={parentIsArray} /> : null}
        <JsonPrimitive value={value} />
      </div>
    );
  }

  return (
    <div className="py-0.5">
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          disabled={!hasEntries}
          onClick={() => onToggle(path)}
          aria-label={isExpanded ? "Collapse JSON node" : "Expand JSON node"}
          className={cn(
            "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[color:var(--color-code-subtle)] transition hover:bg-white/10 hover:text-[color:var(--color-code-ink)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-focus)]",
            !hasEntries && "opacity-40"
          )}
        >
          {hasEntries ? (
            <Icon name={isExpanded ? "chevron-down" : "chevron-right"} className="h-3 w-3" />
          ) : null}
        </button>
        {label ? <JsonKey label={label} isArrayIndex={parentIsArray} /> : null}
        <span className="text-[color:var(--color-code-muted)]">{isArray ? "[" : "{"}</span>
        {!isExpanded || !hasEntries ? (
          <>
            <span className="text-[color:var(--color-code-subtle)]">{getValueLabel(value)}</span>
            <span className="text-[color:var(--color-code-muted)]">{isArray ? "]" : "}"}</span>
          </>
        ) : null}
      </div>

      {isExpanded && hasEntries ? (
        <>
          <div
            className={cn(
              childIndentClass,
              "border-l border-white/10 pl-3 text-[color:var(--color-code-ink)]"
            )}
          >
            {entries.map(([key, entryValue]) => {
              const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`;
              return (
                <JsonNode
                  key={childPath}
                  depth={depth + 1}
                  defaultExpandedDepth={defaultExpandedDepth}
                  expandedState={expandedState}
                  label={key}
                  onToggle={onToggle}
                  parentIsArray={isArray}
                  path={childPath}
                  value={entryValue}
                />
              );
            })}
          </div>
          <div className="flex items-start gap-2 py-0.5">
            <span className="h-4 w-4 shrink-0" />
            <span className="text-[color:var(--color-code-muted)]">{isArray ? "]" : "}"}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

function JsonKey({ isArrayIndex, label }: { isArrayIndex: boolean; label: string }) {
  if (isArrayIndex) {
    return <span className="text-[color:var(--color-code-subtle)]">[{label}]</span>;
  }

  return (
    <span className="whitespace-nowrap text-[color:var(--color-code-muted)]">
      {JSON.stringify(label)}
      <span className="text-[color:var(--color-code-subtle)]">:</span>
    </span>
  );
}

/**
 * JsonView gives admin operators an inspectable structured viewer for runtime
 * payloads, configuration documents, and debug snapshots.
 */
export function JsonView({
  className,
  collapseAllLabel = "Collapse all",
  copiedLabel = "Copied",
  copyErrorLabel = "Copy failed",
  copyLabel = "Copy JSON",
  defaultExpandedDepth = 2,
  expandAllLabel = "Expand all",
  showToolbar = true,
  title,
  value,
  ...props
}: JsonViewProps) {
  const [expandedState, setExpandedState] = useState<ExpandedState>({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const serialized = useMemo(() => stringifyJson(value), [value]);
  const expandablePaths = useMemo(() => getExpandablePaths(value), [value]);

  function togglePath(path: JsonPath) {
    setExpandedState((current) => {
      const isExpanded =
        current[path] ??
        path.split(".").length + (path.match(/\[/g)?.length ?? 0) - 1 < defaultExpandedDepth;
      return { ...current, [path]: !isExpanded };
    });
  }

  function setAllExpanded(expanded: boolean) {
    setExpandedState(
      Object.fromEntries(expandablePaths.map((path) => [path, expanded])) as ExpandedState
    );
  }

  function handleCopy() {
    void copyToClipboard(serialized)
      .then(() => {
        setCopyState("copied");
        window.setTimeout(() => setCopyState("idle"), 1800);
      })
      .catch(() => {
        setCopyState("error");
        window.setTimeout(() => setCopyState("idle"), 1800);
      });
  }

  return (
    <section className={cn("grid gap-2", className)} {...props}>
      {title || showToolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title ? <Eyebrow className="text-xs">{title}</Eyebrow> : <span />}
          {showToolbar ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={expandablePaths.length === 0}
                onClick={() => setAllExpanded(true)}
              >
                {expandAllLabel}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={expandablePaths.length === 0}
                onClick={() => setAllExpanded(false)}
              >
                {collapseAllLabel}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
                <Icon name="copy" className="h-3.5 w-3.5" />
                {copyState === "copied"
                  ? copiedLabel
                  : copyState === "error"
                    ? copyErrorLabel
                    : copyLabel}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="overflow-auto rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-code-surface)] px-4 py-4 font-mono text-xs leading-6 shadow-[var(--shadow-sm)]">
        <JsonNode
          depth={0}
          defaultExpandedDepth={defaultExpandedDepth}
          expandedState={expandedState}
          onToggle={togglePath}
          parentIsArray={false}
          path="$"
          value={value}
        />
      </div>
    </section>
  );
}

export function JsonViewDialog({
  closeLabel = "Close",
  closeShortcutLabel = "Esc",
  description,
  onClose,
  open,
  payloadTitle,
  title,
  value,
  variant = "drawer",
  width = "lg"
}: JsonViewDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeLabel={closeLabel}
      closeShortcutLabel={closeShortcutLabel}
      closeVariant="icon"
      title={title}
      description={description}
      width={width}
      variant={variant}
    >
      <JsonView title={payloadTitle} value={value} defaultExpandedDepth={3} />
    </Dialog>
  );
}
