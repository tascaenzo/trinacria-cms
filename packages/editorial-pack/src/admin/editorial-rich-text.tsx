import { Button, Dialog, Icon, Input, Toolbar, ToolbarButton } from "@trinacria-cms/trinacria-ui";
import {
  type CSSProperties,
  type ReactNode,
  type TextareaHTMLAttributes,
  useEffect,
  useRef,
  useState
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
            <code className="rounded bg-[color:var(--color-panel-soft)] px-1 py-0.5 font-mono text-[0.9em]">
              {content}
            </code>
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
  const [linkSelection, setLinkSelection] = useState<{ start: number; end: number } | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
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
  const openLinkDialog = () => {
    const input = inputRef.current;
    if (!input || input.selectionStart === input.selectionEnd) return;
    setLinkSelection({ start: input.selectionStart, end: input.selectionEnd });
    setLinkUrl("");
    setLinkError(null);
  };
  const applyLink = () => {
    if (!linkSelection || disabled) return;
    const link = parseLink(linkUrl.trim());
    if (!link) {
      setLinkError("Inserisci un URL http/https, mailto, un percorso interno o entry:<id>.");
      return;
    }
    onChange({
      text: value.text,
      inline: applyInlineFormat(value, linkSelection.start, linkSelection.end, { link })
    });
    setLinkSelection(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="group/rich-text relative">
      <Toolbar
        label="Formattazione testo"
        hiddenUntilFocus
        className="absolute -top-24 left-1 z-20 sm:-top-10 group-focus-within/rich-text:flex"
      >
        <ToolbarButton
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          label="Grassetto"
          onClick={() => applyMark("bold")}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          label="Corsivo"
          onClick={() => applyMark("italic")}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          label="Codice"
          onClick={() => applyMark("code")}
        >
          <span className="font-mono">&lt;/&gt;</span>
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          label="Aggiungi link"
          onClick={openLinkDialog}
        >
          <Icon className="h-3.5 w-3.5" name="link" />
        </ToolbarButton>
      </Toolbar>
      <Dialog
        open={linkSelection !== null}
        title="Aggiungi link"
        description="Collega il testo selezionato a una pagina o a un contenuto."
        closeLabel="Chiudi"
        closeVariant="icon"
        onClose={() => setLinkSelection(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLinkSelection(null)}>
              Annulla
            </Button>
            <Button disabled={disabled || !linkUrl.trim()} onClick={applyLink}>
              Inserisci link
            </Button>
          </>
        }
      >
        <Input
          label="Destinazione link"
          placeholder="https:// oppure entry:<id>"
          value={linkUrl}
          error={linkError}
          disabled={disabled}
          onChange={(event) => {
            setLinkUrl(event.currentTarget.value);
            setLinkError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyLink();
            }
          }}
        />
      </Dialog>
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
