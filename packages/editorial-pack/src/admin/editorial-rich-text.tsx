import { Icon } from "@trinacria-cms/trinacria-ui";
import {
  type CSSProperties,
  type ReactNode,
  type TextareaHTMLAttributes,
  useEffect,
  useRef
} from "react";
import type { InlineText, RichTextData } from "../modules/entries/structured-document.contract.js";

type Mark = "bold" | "italic" | "code";

export function InlineTextPreview({ value }: { value: RichTextData }) {
  const segments = normalizedInlineText(value);
  return (
    <>
      {segments.map((segment, index) => {
        let content: ReactNode = segment.text;
        if (segment.code)
          content = (
            <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.9em]">{content}</code>
          );
        if (segment.italic) content = <em>{content}</em>;
        if (segment.bold) content = <strong>{content}</strong>;
        return segment.link ? (
          <a
            className="underline decoration-current/40 underline-offset-2 hover:decoration-current"
            href={segment.link.href}
            key={`${segment.text}-${index}`}
            rel={isExternalUrl(segment.link.href) ? "noreferrer" : undefined}
            target={isExternalUrl(segment.link.href) ? "_blank" : undefined}
          >
            {content}
          </a>
        ) : (
          <span key={`${segment.text}-${index}`}>{content}</span>
        );
      })}
    </>
  );
}

export function RichTextEditor({
  ariaLabel,
  autoFocus,
  className,
  disabled,
  onChange,
  onKeyDown,
  placeholder,
  rows,
  style,
  value
}: {
  ariaLabel: string;
  autoFocus?: boolean;
  className: string;
  disabled: boolean;
  onChange: (value: RichTextData) => void;
  onKeyDown?: TextareaHTMLAttributes<HTMLTextAreaElement>["onKeyDown"];
  placeholder: string;
  rows: number;
  style?: CSSProperties;
  value: RichTextData;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);
  const applyMark = (mark: Mark) => {
    const input = inputRef.current;
    if (!input || input.selectionStart === input.selectionEnd) return;
    onChange({
      text: value.text,
      inline: applyInlineFormat(value, input.selectionStart, input.selectionEnd, { mark })
    });
    requestAnimationFrame(() => input.focus());
  };
  const applyLink = () => {
    const input = inputRef.current;
    if (!input || input.selectionStart === input.selectionEnd || typeof window === "undefined")
      return;
    const raw = window.prompt("Incolla un URL oppure scrivi entry:<id> per un riferimento interno");
    if (!raw?.trim()) return;
    const link = parseLink(raw.trim());
    if (!link) return;
    onChange({
      text: value.text,
      inline: applyInlineFormat(value, input.selectionStart, input.selectionEnd, { link })
    });
    requestAnimationFrame(() => input.focus());
  };

  return (
    <div className="group/rich-text relative">
      <div className="absolute -top-7 left-1 z-20 hidden items-center gap-0.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-0.5 shadow-[var(--shadow-sm)] group-focus-within/rich-text:flex">
        <FormatButton label="Grassetto" onClick={() => applyMark("bold")}>
          B
        </FormatButton>
        <FormatButton label="Corsivo" onClick={() => applyMark("italic")}>
          <em>I</em>
        </FormatButton>
        <FormatButton label="Codice" onClick={() => applyMark("code")}>
          <span className="font-mono">&lt;/&gt;</span>
        </FormatButton>
        <FormatButton label="Aggiungi link" onClick={applyLink}>
          <Icon className="h-3.5 w-3.5" name="link" />
        </FormatButton>
      </div>
      <textarea
        ref={inputRef}
        aria-label={ariaLabel}
        className={className}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        style={style}
        value={value.text}
        onChange={(event) => onChange({ text: event.currentTarget.value })}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

function FormatButton({
  children,
  label,
  onClick
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-6 min-w-6 items-center justify-center rounded px-1 text-xs text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)]"
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function normalizedInlineText(value: RichTextData): InlineText[] {
  const inline = value.inline?.filter((segment) => segment.text.length > 0);
  return inline?.map((segment) => ({ ...segment })) ?? (value.text ? [{ text: value.text }] : []);
}

function applyInlineFormat(
  value: RichTextData,
  start: number,
  end: number,
  change: { mark?: Mark; link?: InlineText["link"] }
): InlineText[] {
  const source = normalizedInlineText(value);
  const selectedSegments = source.filter((segment, index) => {
    const segmentStart = source.slice(0, index).reduce((sum, item) => sum + item.text.length, 0);
    return segmentStart < end && segmentStart + segment.text.length > start;
  });
  const shouldRemoveMark = change.mark
    ? selectedSegments.length > 0 && selectedSegments.every((segment) => segment[change.mark!])
    : false;
  let position = 0;
  return source.flatMap((segment) => {
    const segmentStart = position;
    const segmentEnd = position + segment.text.length;
    position = segmentEnd;
    if (segmentEnd <= start || segmentStart >= end) return [segment];
    const parts: InlineText[] = [];
    const selectedStart = Math.max(start, segmentStart);
    const selectedEnd = Math.min(end, segmentEnd);
    if (selectedStart > segmentStart)
      parts.push({ ...segment, text: segment.text.slice(0, selectedStart - segmentStart) });
    const selected: InlineText = {
      ...segment,
      text: segment.text.slice(selectedStart - segmentStart, selectedEnd - segmentStart)
    };
    if (change.mark) {
      if (shouldRemoveMark) delete selected[change.mark];
      else selected[change.mark] = true;
    }
    if (change.link) selected.link = change.link;
    parts.push(selected);
    if (selectedEnd < segmentEnd)
      parts.push({ ...segment, text: segment.text.slice(selectedEnd - segmentStart) });
    return parts;
  });
}

function parseLink(value: string): InlineText["link"] | null {
  if (value.startsWith("entry:")) {
    const entryId = value.slice("entry:".length).trim();
    return entryId ? { href: `#entry:${entryId}`, entryId } : null;
  }
  if (/^(https?:|mailto:|\/)/i.test(value)) return { href: value };
  return null;
}

function isExternalUrl(href: string) {
  return /^(https?:|mailto:)/i.test(href);
}
