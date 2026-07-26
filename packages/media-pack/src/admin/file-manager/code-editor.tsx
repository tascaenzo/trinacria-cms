import { Icon } from "@trinacria-cms/trinacria-ui";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";

interface CodeEditorProps {
  ariaLabel: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  value: string;
}

/** Dependency-free text editor with line numbers, search and native undo/redo. */
export function CodeEditor({ ariaLabel, onChange, readOnly = false, value }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLPreElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const lineCount = useMemo(() => value.split("\n").length, [value]);
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1).join("\n"),
    [lineCount]
  );
  const matchCount = useMemo(
    () => (search ? value.toLocaleLowerCase().split(search.toLocaleLowerCase()).length - 1 : 0),
    [search, value]
  );

  function updateCursor(textarea = textareaRef.current) {
    if (!textarea) return;
    const before = textarea.value.slice(0, textarea.selectionStart);
    const lines = before.split("\n");
    setCursor({ line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }
    if (event.key !== "Tab" || readOnly) return;
    event.preventDefault();
    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${value.slice(0, start)}  ${value.slice(end)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      updateCursor(textarea);
    });
  }

  function findNext() {
    const textarea = textareaRef.current;
    if (!textarea || !search) return;
    const content = value.toLocaleLowerCase();
    const query = search.toLocaleLowerCase();
    let index = content.indexOf(query, textarea.selectionEnd);
    if (index < 0) index = content.indexOf(query);
    if (index < 0) return;
    textarea.focus();
    textarea.setSelectionRange(index, index + search.length);
    updateCursor(textarea);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[color:var(--color-surface)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-3 py-2">
        <div className="flex min-w-48 flex-1 items-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 focus-within:ring-2 focus-within:ring-[color:var(--color-focus)]">
          <Icon name="search" className="h-4 w-4 shrink-0 text-[color:var(--color-ink-subtle)]" />
          <input
            ref={searchRef}
            aria-label="Cerca nel file"
            placeholder="Cerca nel file"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                findNext();
              }
            }}
            className="h-8 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
          />
          <span className="shrink-0 text-xs text-[color:var(--color-ink-subtle)]">
            {search ? `${matchCount} risultati` : "⌘F"}
          </span>
        </div>
        <button
          type="button"
          disabled={!search || matchCount === 0}
          onClick={findNext}
          className="h-8 rounded-md border border-[color:var(--color-border)] px-3 text-sm text-[color:var(--color-ink-muted)] disabled:opacity-40"
        >
          Successivo
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 overflow-hidden font-mono text-[13px] leading-6">
        <pre
          ref={gutterRef}
          aria-hidden="true"
          className="m-0 min-w-12 select-none overflow-hidden border-r border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-3 py-4 text-right text-[color:var(--color-ink-subtle)]"
        >
          {lineNumbers}
        </pre>
        <textarea
          ref={textareaRef}
          aria-label={ariaLabel}
          readOnly={readOnly}
          spellCheck={false}
          wrap="off"
          value={value}
          onChange={(event) => {
            onChange(event.currentTarget.value);
            updateCursor(event.currentTarget);
          }}
          onClick={(event) => updateCursor(event.currentTarget)}
          onKeyUp={(event) => updateCursor(event.currentTarget)}
          onKeyDown={handleKeyDown}
          onScroll={(event) => {
            if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
          }}
          className="h-full min-h-0 min-w-0 flex-1 resize-none overflow-auto whitespace-pre border-0 bg-[color:var(--color-surface)] p-4 font-mono text-[13px] leading-6 text-[color:var(--color-ink)] outline-none focus:ring-2 focus:ring-inset focus:ring-[color:var(--color-focus)]"
        />
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-3 py-1.5 text-xs text-[color:var(--color-ink-subtle)]">
        <span>
          Riga {cursor.line}, colonna {cursor.column}
        </span>
        <span>
          {lineCount} righe · {value.length} caratteri
        </span>
      </div>
    </div>
  );
}
