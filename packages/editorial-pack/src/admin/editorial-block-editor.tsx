import { FileManager, type MediaFileManagerSelection } from "@trinacria-cms/media-pack/admin";
import { Button, ColorSwatchGrid, DropIndicator, Icon, Input } from "@trinacria-cms/trinacria-ui";
import {
  type CSSProperties,
  createContext,
  type DragEvent as ReactDragEvent,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import {
  type BlockAppearance,
  type BlockColor,
  createStructuredContentBlock,
  type StructuredContentBlock,
  type StructuredContentBlockType,
  type StructuredDocument
} from "../modules/entries/structured-document.contract.js";
import {
  moveStructuredContentBlock,
  moveStructuredContentBlockToContainer
} from "../modules/entries/structured-document.operations.js";
import type { CmsClient } from "./editorial-admin.types.js";
import { RichTextEditor } from "./editorial-rich-text.js";

interface DragSession {
  blockId: string;
  sourceContainerId: string;
}

interface EditorDragContextValue {
  session: DragSession | null;
  start: (session: DragSession) => void;
  finish: () => void;
  move: (blockId: string, containerId: string, index: number) => void;
}

const EditorDragContext = createContext<EditorDragContextValue | null>(null);

const BLOCK_TYPES: readonly StructuredContentBlockType[] = [
  "paragraph",
  "heading",
  "image",
  "quote",
  "list",
  "table",
  "layout",
  "divider"
];

const BLOCK_COLORS: readonly {
  key: BlockColor;
  label: string;
  text: string;
  background: string;
}[] = [
  { key: "gray", label: "Grigio", text: "#787774", background: "#f1f1ef" },
  { key: "brown", label: "Marrone", text: "#9f6b53", background: "#f4eeee" },
  { key: "orange", label: "Arancione", text: "#d9730d", background: "#faebdd" },
  { key: "yellow", label: "Giallo", text: "#cb912f", background: "#fbf3db" },
  { key: "green", label: "Verde", text: "#448361", background: "#edf3ec" },
  { key: "blue", label: "Blu", text: "#337ea9", background: "#e7f3f8" },
  { key: "purple", label: "Viola", text: "#9065b0", background: "#f4f0f7" },
  { key: "pink", label: "Rosa", text: "#c14c8a", background: "#f9eef3" },
  { key: "red", label: "Rosso", text: "#d44c47", background: "#fdebec" }
];

const BLOCK_META: Record<
  StructuredContentBlockType,
  {
    label: string;
    description: string;
    icon: "file-text" | "image" | "list" | "grid-2x2" | "columns-3" | "minus";
  }
> = {
  paragraph: {
    label: "Testo",
    description: "Un paragrafo di testo semplice",
    icon: "file-text"
  },
  heading: { label: "Titolo", description: "Una nuova sezione del documento", icon: "file-text" },
  image: { label: "Immagine", description: "Immagine, alt text e didascalia", icon: "image" },
  quote: { label: "Citazione", description: "Citazione con fonte facoltativa", icon: "file-text" },
  list: { label: "Elenco", description: "Elenco puntato o numerato", icon: "list" },
  table: { label: "Tabella", description: "Righe e colonne modificabili", icon: "grid-2x2" },
  layout: { label: "Layout", description: "Colonne con blocchi annidati", icon: "columns-3" },
  divider: { label: "Separatore", description: "Separa due sezioni", icon: "minus" }
};

export interface EditorialBlockEditorProps {
  value: StructuredDocument;
  onChange: (document: StructuredDocument) => void;
  apiBaseUrl?: string;
  cms?: CmsClient;
  disabled?: boolean;
  nested?: boolean;
  nestingLevel?: number;
  containerId?: string;
}

/** Notion-like document canvas. Domain persistence stays in the surrounding page. */
export function EditorialBlockEditor({
  apiBaseUrl,
  cms,
  value,
  onChange,
  disabled = false,
  nested = false,
  nestingLevel = 0,
  containerId = "root"
}: EditorialBlockEditorProps) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const inheritedDragContext = useContext(EditorDragContext);
  const [ownDragSession, setOwnDragSession] = useState<DragSession | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const dragContext: EditorDragContextValue = inheritedDragContext ?? {
    session: ownDragSession,
    start: setOwnDragSession,
    finish: () => setOwnDragSession(null),
    move: (blockId, targetContainerId, index) =>
      onChange(moveStructuredContentBlockToContainer(value, blockId, targetContainerId, index))
  };
  const draggedBlockId = dragContext.session?.blockId ?? null;
  const availableBlockTypes =
    nestingLevel < 3 ? BLOCK_TYPES : BLOCK_TYPES.filter((type) => type !== "layout");

  const replaceBlock = (id: string, next: StructuredContentBlock) => {
    onChange({
      ...value,
      blocks: value.blocks.map((block) => (block.id === id ? next : block))
    });
  };

  const addBlock = (type: StructuredContentBlockType, index: number) => {
    const next = [...value.blocks];
    next.splice(index, 0, createStructuredContentBlock(type, createBlockId()));
    onChange({ ...value, blocks: next });
    setPickerIndex(null);
  };

  const appendParagraph = (text: string) => {
    const block: StructuredContentBlock = {
      id: createBlockId(),
      type: "paragraph",
      version: 1,
      data: { text }
    };
    onChange({
      ...value,
      blocks: [...value.blocks, block]
    });
  };

  const insertParagraph = (index: number, text = "") => {
    const block: StructuredContentBlock = {
      id: createBlockId(),
      type: "paragraph",
      version: 1,
      data: { text }
    };
    const next = [...value.blocks];
    next.splice(index, 0, block);
    onChange({ ...value, blocks: next });
    setFocusBlockId(block.id);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    moveBlockTo(value.blocks[index]?.id ?? null, index + (direction === 1 ? 2 : -1));
  };

  const moveBlockTo = (blockId: string | null, requestedIndex: number) => {
    if (!blockId) return;
    onChange(moveStructuredContentBlock(value, blockId, requestedIndex));
  };

  const duplicateBlock = (index: number) => {
    const source = value.blocks[index];
    if (!source) return;
    const copy = {
      ...source,
      id: createBlockId(),
      data: { ...source.data }
    } as StructuredContentBlock;
    const next = [...value.blocks];
    next.splice(index + 1, 0, copy);
    onChange({ ...value, blocks: next });
  };

  const handleDragOver = (event: ReactDragEvent<HTMLElement>, index: number) => {
    if (!draggedBlockId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setDropIndex(event.clientY < bounds.top + bounds.height / 2 ? index : index + 1);
  };

  const finishDrag = () => {
    dragContext.finish();
    setDropIndex(null);
  };

  const canvas = (
    <section
      aria-label="Editor a blocchi"
      className={
        nested ? "w-full min-w-0 px-1 py-2" : "mx-auto w-full max-w-3xl px-5 pb-32 pt-6 sm:px-10"
      }
    >
      <div
        className={nested ? "min-h-24" : "min-h-[52vh]"}
        onDragOver={(event) => {
          if (!value.blocks.length && draggedBlockId) {
            event.preventDefault();
            setDropIndex(0);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (dropIndex !== null && draggedBlockId) {
            const sourceIndex =
              dragContext.session?.sourceContainerId === containerId
                ? value.blocks.findIndex((block) => block.id === draggedBlockId)
                : -1;
            const insertionIndex =
              sourceIndex >= 0 && sourceIndex < dropIndex ? dropIndex - 1 : dropIndex;
            dragContext.move(draggedBlockId, containerId, insertionIndex);
          }
          finishDrag();
        }}
      >
        {value.blocks.map((block, index) => (
          <div key={block.id}>
            {dropIndex === index ? <DropIndicator /> : null}
            {pickerIndex === index ? (
              <div className="relative z-40 h-0">
                <BlockPicker
                  blockTypes={availableBlockTypes}
                  disabled={disabled}
                  onClose={() => setPickerIndex(null)}
                  onSelect={(type) => addBlock(type, index)}
                />
              </div>
            ) : null}
            <EditableBlock
              apiBaseUrl={apiBaseUrl}
              block={block}
              cms={cms}
              disabled={disabled}
              nestingLevel={nestingLevel}
              nested={nested}
              dragging={draggedBlockId === block.id}
              autoFocus={focusBlockId === block.id}
              isFirst={index === 0}
              isLast={index === value.blocks.length - 1}
              onChange={(next) => replaceBlock(block.id, next)}
              onDragEnd={finishDrag}
              onDragOver={(event) => handleDragOver(event, index)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", block.id);
                dragContext.start({ blockId: block.id, sourceContainerId: containerId });
                setDropIndex(index);
              }}
              onInsert={() => setPickerIndex(index + 1)}
              onCreateParagraph={() => insertParagraph(index + 1)}
              onMove={(direction) => moveBlock(index, direction)}
              onDuplicate={() => duplicateBlock(index)}
              onRemove={() =>
                onChange({
                  ...value,
                  blocks: value.blocks.filter((candidate) => candidate.id !== block.id)
                })
              }
            />
          </div>
        ))}

        {dropIndex === value.blocks.length ? <DropIndicator /> : null}
        {pickerIndex === value.blocks.length ? (
          <div className="relative z-40 h-0">
            <BlockPicker
              blockTypes={availableBlockTypes}
              disabled={disabled}
              onClose={() => setPickerIndex(null)}
              onSelect={(type) => addBlock(type, value.blocks.length)}
            />
          </div>
        ) : null}
        <PhantomBlock
          disabled={disabled}
          onInsert={appendParagraph}
          onOpenPicker={() => setPickerIndex(value.blocks.length)}
        />
      </div>
    </section>
  );
  return inheritedDragContext ? (
    canvas
  ) : (
    <EditorDragContext.Provider value={dragContext}>{canvas}</EditorDragContext.Provider>
  );
}

function BlockPicker({
  blockTypes,
  disabled,
  onClose,
  onSelect
}: {
  blockTypes: readonly StructuredContentBlockType[];
  disabled: boolean;
  onClose: () => void;
  onSelect: (type: StructuredContentBlockType) => void;
}) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredTypes = blockTypes.filter((type) => {
    const meta = BLOCK_META[type];
    return `${meta.label} ${meta.description}`.toLocaleLowerCase().includes(normalizedQuery);
  });

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div
      className="absolute left-10 top-2 w-[20rem] max-w-[calc(100vw-3rem)] overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-[var(--shadow-popover)]"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
        if (event.key === "Enter" && filteredTypes[0]) {
          event.preventDefault();
          onSelect(filteredTypes[0]);
        }
      }}
    >
      <div className="border-b border-[color:var(--color-border)] p-2">
        <div className="flex items-center gap-2 rounded-md bg-[color:var(--color-surface-subtle)] px-2.5">
          <Icon name="search" className="h-4 w-4 text-[color:var(--color-ink-subtle)]" />
          <input
            ref={searchInputRef}
            aria-label="Cerca un blocco"
            placeholder="Cerca un blocco"
            value={query}
            className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)]"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto p-1.5">
        <p className="px-2 pb-1 pt-1 text-[11px] font-medium text-[color:var(--color-ink-subtle)]">
          Blocchi base
        </p>
        {filteredTypes.map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-[color:var(--color-interactive-hover)] disabled:opacity-50"
            onClick={() => onSelect(type)}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)]">
              <Icon name={BLOCK_META[type].icon} className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-[color:var(--color-ink)]">
                {BLOCK_META[type].label}
              </span>
              <span className="block truncate text-xs text-[color:var(--color-ink-muted)]">
                {BLOCK_META[type].description}
              </span>
            </span>
          </button>
        ))}
        {!filteredTypes.length ? (
          <p className="px-3 py-6 text-center text-sm text-[color:var(--color-ink-muted)]">
            Nessun blocco trovato
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PhantomBlock({
  disabled,
  onInsert,
  onOpenPicker
}: {
  disabled: boolean;
  onInsert: (text: string) => void;
  onOpenPicker: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="group relative mt-1 rounded-md py-1 pl-12 pr-2">
      <button
        type="button"
        aria-label="Aggiungi un blocco"
        disabled={disabled}
        className="absolute left-1 top-1 flex h-8 w-8 items-center justify-center rounded text-[color:var(--color-ink-subtle)] opacity-0 transition hover:bg-[color:var(--color-interactive-hover)] group-hover:opacity-100 group-focus-within:opacity-100"
        onClick={onOpenPicker}
      >
        <Icon name="plus" className="h-4 w-4" />
      </button>
      <textarea
        rows={1}
        aria-label="Nuovo paragrafo"
        placeholder="Scrivi qualcosa oppure premi / per i comandi"
        value={text}
        disabled={disabled}
        className="block min-h-10 w-full border-0 bg-transparent px-1 py-1.5 text-base leading-7 text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)]"
        style={{ fieldSizing: "content", resize: "none" }}
        onKeyDown={(event) => {
          if ((event.key === "/" || event.code === "Slash") && !text) {
            event.preventDefault();
            onOpenPicker();
          }
          if (event.key === "Enter" && text.trim()) {
            event.preventDefault();
            onInsert(text);
            setText("");
          }
        }}
        onChange={(event) => setText(event.currentTarget.value)}
      />
    </div>
  );
}

function EditableBlock({
  apiBaseUrl,
  block,
  cms,
  disabled,
  dragging,
  autoFocus,
  isFirst,
  isLast,
  nestingLevel,
  nested,
  onChange,
  onDragEnd,
  onDragOver,
  onDragStart,
  onInsert,
  onCreateParagraph,
  onMove,
  onDuplicate,
  onRemove
}: {
  apiBaseUrl?: string;
  block: StructuredContentBlock;
  cms?: CmsClient;
  disabled: boolean;
  dragging: boolean;
  autoFocus: boolean;
  isFirst: boolean;
  isLast: boolean;
  nestingLevel: number;
  nested: boolean;
  onChange: (block: StructuredContentBlock) => void;
  onDragEnd: () => void;
  onDragOver: (event: ReactDragEvent<HTMLElement>) => void;
  onDragStart: (event: ReactDragEvent<HTMLButtonElement>) => void;
  onInsert: () => void;
  onCreateParagraph: () => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  return (
    <article
      className={`group relative rounded-md py-1 transition ${nested ? "pl-7 pr-1" : "pl-12 pr-2"} ${
        dragging ? "opacity-35" : "opacity-100"
      }`}
      style={blockAppearanceStyle(block.appearance)}
      onDragOver={onDragOver}
    >
      <div
        className={`absolute left-0 top-1 flex opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 ${nested ? "flex-col" : "items-center"}`}
      >
        <button
          type="button"
          className={`flex items-center justify-center rounded text-[color:var(--color-ink-subtle)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)] ${nested ? "h-6 w-5" : "h-8 w-6"}`}
          aria-label="Inserisci blocco dopo"
          disabled={disabled}
          onClick={onInsert}
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
        <button
          type="button"
          draggable={!disabled}
          className={`flex cursor-grab items-center justify-center rounded text-[color:var(--color-ink-subtle)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)] active:cursor-grabbing ${nested ? "h-6 w-5" : "h-8 w-6"}`}
          aria-label={`Trascina blocco ${BLOCK_META[block.type].label}`}
          disabled={disabled}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <Icon name="grip-vertical" className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`absolute -top-8 right-2 z-10 hidden items-center gap-0.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-0.5 shadow-[var(--shadow-sm)] group-hover:flex group-focus-within:flex ${nested ? "" : "xl:left-full xl:right-auto xl:top-1 xl:ml-2"}`}
      >
        <BlockContextSettings block={block} disabled={disabled} onChange={onChange} />
        <BlockColorMenu
          appearance={block.appearance}
          disabled={disabled}
          open={isColorMenuOpen}
          onOpenChange={setIsColorMenuOpen}
          onChange={(appearance) => onChange({ ...block, appearance } as StructuredContentBlock)}
        />
        <ToolbarButton
          label="Sposta sopra"
          icon="chevron-up"
          disabled={disabled || isFirst}
          onClick={() => onMove(-1)}
        />
        <ToolbarButton
          label="Sposta sotto"
          icon="chevron-down"
          disabled={disabled || isLast}
          onClick={() => onMove(1)}
        />
        <ToolbarButton label="Duplica" icon="copy" disabled={disabled} onClick={onDuplicate} />
        <ToolbarButton label="Elimina" icon="trash-2" disabled={disabled} onClick={onRemove} />
      </div>

      <BlockFields
        apiBaseUrl={apiBaseUrl}
        block={block}
        cms={cms}
        disabled={disabled}
        nestingLevel={nestingLevel}
        autoFocus={autoFocus}
        onChange={onChange}
        onCreateParagraph={onCreateParagraph}
        onInsert={onInsert}
        onRemove={onRemove}
      />
    </article>
  );
}

function BlockContextSettings({
  block,
  disabled,
  onChange
}: {
  block: StructuredContentBlock;
  disabled: boolean;
  onChange: (block: StructuredContentBlock) => void;
}) {
  if (block.type === "heading") {
    return (
      <select
        aria-label="Livello del titolo"
        value={String(block.data.level)}
        disabled={disabled}
        className="h-7 rounded border-0 bg-transparent px-1.5 text-xs font-medium text-[color:var(--color-ink-muted)] outline-none hover:bg-[color:var(--color-interactive-hover)]"
        onChange={(event) =>
          onChange({
            ...block,
            data: { ...block.data, level: Number(event.currentTarget.value) as 2 | 3 | 4 }
          })
        }
      >
        <option value="2">Titolo 2</option>
        <option value="3">Titolo 3</option>
        <option value="4">Titolo 4</option>
      </select>
    );
  }
  if (block.type === "list") {
    return (
      <select
        aria-label="Stile elenco"
        value={block.data.style}
        disabled={disabled}
        className="h-7 rounded border-0 bg-transparent px-1.5 text-xs font-medium text-[color:var(--color-ink-muted)] outline-none hover:bg-[color:var(--color-interactive-hover)]"
        onChange={(event) =>
          onChange({
            ...block,
            data: { ...block.data, style: event.currentTarget.value as "bulleted" | "numbered" }
          })
        }
      >
        <option value="bulleted">Punti</option>
        <option value="numbered">Numeri</option>
      </select>
    );
  }
  if (block.type === "table") {
    return (
      <button
        type="button"
        disabled={disabled}
        className="h-7 rounded px-1.5 text-xs font-medium text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)]"
        aria-pressed={block.data.hasHeader}
        onClick={() =>
          onChange({ ...block, data: { ...block.data, hasHeader: !block.data.hasHeader } })
        }
      >
        Intestazione
      </button>
    );
  }
  return (
    <span className="px-1.5 text-[11px] font-medium text-[color:var(--color-ink-subtle)]">
      {BLOCK_META[block.type].label}
    </span>
  );
}

function BlockColorMenu({
  appearance,
  disabled,
  open,
  onChange,
  onOpenChange
}: {
  appearance?: BlockAppearance;
  disabled: boolean;
  open: boolean;
  onChange: (appearance: BlockAppearance) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") onOpenChange(false);
      }}
    >
      <button
        type="button"
        className="flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs font-semibold text-[color:var(--color-ink-subtle)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)]"
        aria-label="Colori del blocco"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
      >
        A
        <span
          aria-hidden="true"
          className="ml-1 h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: colorValue(appearance?.textColor, "text") ?? "currentColor"
          }}
        />
      </button>
      {open ? (
        <div className="absolute right-0 top-8 z-50 w-64 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-3 shadow-[var(--shadow-popover)]">
          <ColorRow
            label="Colore testo"
            selected={appearance?.textColor}
            mode="text"
            onSelect={(textColor) => onChange({ ...appearance, textColor })}
          />
          <div className="mt-3">
            <ColorRow
              label="Colore sfondo"
              selected={appearance?.backgroundColor}
              mode="background"
              onSelect={(backgroundColor) => onChange({ ...appearance, backgroundColor })}
            />
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-md px-2 py-1.5 text-left text-xs text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)]"
            onClick={() => {
              onChange({});
              onOpenChange(false);
            }}
          >
            Ripristina colori
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ColorRow({
  label,
  mode,
  onSelect,
  selected
}: {
  label: string;
  mode: "text" | "background";
  onSelect: (color: BlockColor) => void;
  selected?: BlockColor;
}) {
  return (
    <ColorSwatchGrid
      label={label}
      options={BLOCK_COLORS.map((color) => ({
        value: color.key,
        label: color.label,
        foregroundColor: color.text,
        backgroundColor: mode === "text" ? "var(--color-panel)" : color.background
      }))}
      selected={selected}
      onSelect={(color) => onSelect(color as BlockColor)}
      renderSwatch={mode === "text" ? () => "A" : undefined}
    />
  );
}

function ToolbarButton({
  disabled,
  icon,
  label,
  onClick
}: {
  disabled: boolean;
  icon: "chevron-up" | "chevron-down" | "copy" | "trash-2";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 items-center justify-center rounded text-[color:var(--color-ink-subtle)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)] disabled:opacity-35"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
    </button>
  );
}

function BlockFields({
  apiBaseUrl,
  block,
  cms,
  disabled,
  nestingLevel,
  autoFocus,
  onChange,
  onCreateParagraph,
  onInsert,
  onRemove
}: {
  apiBaseUrl?: string;
  block: StructuredContentBlock;
  cms?: CmsClient;
  disabled: boolean;
  nestingLevel: number;
  autoFocus: boolean;
  onChange: (block: StructuredContentBlock) => void;
  onCreateParagraph: () => void;
  onInsert: () => void;
  onRemove: () => void;
}) {
  if (block.type === "paragraph") {
    return (
      <RichTextEditor
        ariaLabel="Paragrafo"
        autoFocus={autoFocus}
        rows={2}
        placeholder="Scrivi qualcosa, oppure premi / per inserire un blocco"
        disabled={disabled}
        className="block min-h-10 w-full resize-y border-0 bg-transparent px-1 py-1.5 text-base leading-7 text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)]"
        style={{ fieldSizing: "content", resize: "none" }}
        onKeyDown={(event) => {
          if ((event.key === "/" || event.code === "Slash") && !block.data.text) {
            event.preventDefault();
            onInsert();
          }
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onCreateParagraph();
          }
          if (event.key === "Backspace" && !block.data.text) {
            event.preventDefault();
            onRemove();
          }
        }}
        value={block.data}
        onChange={(data) => onChange({ ...block, data })}
      />
    );
  }
  if (block.type === "heading") {
    return (
      <RichTextEditor
        ariaLabel="Titolo"
        autoFocus={autoFocus}
        rows={1}
        placeholder="Titolo della sezione"
        disabled={disabled}
        className={`block min-h-11 w-full resize-none border-0 bg-transparent px-1 py-1 font-semibold leading-tight text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)] ${
          block.data.level === 2 ? "text-3xl" : block.data.level === 3 ? "text-2xl" : "text-xl"
        }`}
        style={{
          fieldSizing: "content",
          fontSize:
            block.data.level === 2 ? "1.875rem" : block.data.level === 3 ? "1.5rem" : "1.25rem",
          fontWeight: 600,
          lineHeight: 1.25,
          resize: "none"
        }}
        value={block.data}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onCreateParagraph();
          }
          if (event.key === "Backspace" && !block.data.text) {
            event.preventDefault();
            onRemove();
          }
        }}
        onChange={(data) => onChange({ ...block, data: { ...block.data, ...data } })}
      />
    );
  }
  if (block.type === "quote") {
    return (
      <div className="border-l-4 border-[color:var(--color-ink-subtle)] py-1 pl-4">
        <RichTextEditor
          ariaLabel="Citazione"
          autoFocus={autoFocus}
          rows={2}
          placeholder="Scrivi una citazione"
          disabled={disabled}
          className="block w-full resize-y border-0 bg-transparent px-1 py-1 text-lg italic leading-7 text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)]"
          style={{
            fieldSizing: "content",
            fontSize: "1.125rem",
            fontStyle: "italic",
            resize: "none"
          }}
          value={block.data}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onCreateParagraph();
            }
            if (event.key === "Backspace" && !block.data.text) {
              event.preventDefault();
              onRemove();
            }
          }}
          onChange={(data) => onChange({ ...block, data: { ...block.data, ...data } })}
        />
        <input
          aria-label="Fonte della citazione"
          placeholder="Fonte facoltativa"
          value={block.data.citation ?? ""}
          disabled={disabled}
          className="block w-full border-0 bg-transparent px-1 py-1 text-sm text-[color:var(--color-ink-muted)] outline-none placeholder:text-[color:var(--color-ink-subtle)]"
          onChange={(event) =>
            onChange({
              ...block,
              data: event.currentTarget.value.trim()
                ? { ...block.data, citation: event.currentTarget.value }
                : { text: block.data.text }
            })
          }
        />
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <ImageBlockFields
        apiBaseUrl={apiBaseUrl}
        block={block}
        cms={cms}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }
  if (block.type === "layout") {
    return (
      <LayoutBlockFields
        apiBaseUrl={apiBaseUrl}
        block={block}
        cms={cms}
        disabled={disabled}
        nestingLevel={nestingLevel}
        onChange={onChange}
      />
    );
  }
  if (block.type === "table") {
    return <TableBlockFields block={block} disabled={disabled} onChange={onChange} />;
  }
  if (block.type === "list") {
    return <ListBlockFields block={block} disabled={disabled} onChange={onChange} />;
  }
  return <hr className="my-5 border-[color:var(--color-border)]" aria-label="Separatore" />;
}

function ImageBlockFields({
  apiBaseUrl = "/cms",
  block,
  cms,
  disabled,
  onChange
}: {
  apiBaseUrl?: string;
  block: Extract<StructuredContentBlock, { type: "image" }>;
  cms?: CmsClient;
  disabled: boolean;
  onChange: (block: StructuredContentBlock) => void;
}) {
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(block.data.src);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!block.data.assetId || !cms) {
      setPreviewUrl(block.data.src);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewError(null);
    void cms
      .request<{ data: { url: string } }>({
        method: "POST",
        path: `/v1/media/assets/${encodeURIComponent(block.data.assetId)}/access-url`
      })
      .then((response) => {
        if (!cancelled) setPreviewUrl(resolveMediaUrl(response.data.url, apiBaseUrl));
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl("");
          setPreviewError("Anteprima non disponibile. Puoi scegliere nuovamente il media.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, block.data.assetId, block.data.src, cms]);

  function selectMedia(selection: MediaFileManagerSelection) {
    setPreviewUrl(selection.url);
    setPreviewError(null);
    onChange({
      ...block,
      data: {
        ...block.data,
        src: "",
        assetId: selection.asset.id,
        alt: block.data.alt || selection.asset.displayName
      }
    });
  }

  function clearMedia() {
    setPreviewUrl("");
    setPreviewError(null);
    onChange({
      ...block,
      data: {
        src: "",
        alt: block.data.alt,
        ...(block.data.caption ? { caption: block.data.caption } : {})
      }
    });
  }

  const hasSelectedMedia = Boolean(block.data.assetId || block.data.src);

  return (
    <div className="grid gap-3 py-2">
      {previewUrl ? (
        <figure className="overflow-hidden rounded-md bg-[color:var(--color-surface-subtle)]">
          <img
            src={previewUrl}
            alt={block.data.alt}
            className="max-h-[34rem] w-full object-contain"
          />
        </figure>
      ) : (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-subtle)] px-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[color:var(--color-panel)] text-[color:var(--color-ink-subtle)] shadow-[var(--shadow-sm)]">
            <Icon name="image" className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-[color:var(--color-ink)]">
            {previewError ?? "Scegli un’immagine dalla libreria media"}
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
            Il File Manager mostra soltanto file immagine.
          </p>
          {cms ? (
            <Button
              type="button"
              size="sm"
              className="mt-4"
              disabled={disabled}
              onClick={() => setIsFileManagerOpen(true)}
            >
              <Icon name="folder-open" className="h-4 w-4" />
              Apri File Manager
            </Button>
          ) : null}
        </div>
      )}

      {hasSelectedMedia ? (
        <div className="flex flex-wrap items-center gap-2">
          {cms ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => setIsFileManagerOpen(true)}
            >
              <Icon name="folder-open" className="h-4 w-4" />
              Sostituisci
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={clearMedia}>
            Rimuovi
          </Button>
        </div>
      ) : null}

      {!cms ? (
        <Input
          label="URL immagine"
          type="url"
          value={block.data.src}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...block,
              data: {
                src: event.currentTarget.value,
                alt: block.data.alt,
                ...(block.data.caption ? { caption: block.data.caption } : {})
              }
            })
          }
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Testo alternativo"
          value={block.data.alt}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...block, data: { ...block.data, alt: event.currentTarget.value } })
          }
        />
        <Input
          label="Didascalia"
          value={block.data.caption ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const caption = event.currentTarget.value;
            onChange({
              ...block,
              data: caption.trim()
                ? { ...block.data, caption }
                : {
                    src: block.data.src,
                    alt: block.data.alt,
                    ...(block.data.assetId ? { assetId: block.data.assetId } : {})
                  }
            });
          }}
        />
      </div>

      {cms ? (
        <FileManager
          acceptedMimeTypes={["image/*"]}
          apiBaseUrl={apiBaseUrl}
          cms={cms}
          open={isFileManagerOpen}
          presentation="modal"
          selectionMode="single"
          selectLabel="Usa immagine"
          onClose={() => setIsFileManagerOpen(false)}
          onSelect={selectMedia}
        />
      ) : null}
    </div>
  );
}

function LayoutBlockFields({
  apiBaseUrl,
  block,
  cms,
  disabled,
  nestingLevel,
  onChange
}: {
  apiBaseUrl?: string;
  block: Extract<StructuredContentBlock, { type: "layout" }>;
  cms?: CmsClient;
  disabled: boolean;
  nestingLevel: number;
  onChange: (block: StructuredContentBlock) => void;
}) {
  const columns = block.data.columns;
  const lastColumn = columns.at(-1);

  function updateColumn(columnId: string, blocks: StructuredContentBlock[]) {
    onChange({
      ...block,
      data: {
        columns: columns.map((column) => (column.id === columnId ? { ...column, blocks } : column))
      }
    });
  }

  function addColumn() {
    if (columns.length >= 3) return;
    onChange({
      ...block,
      data: {
        columns: [...columns, { id: `${block.id}-column-${createBlockId()}`, blocks: [] }]
      }
    });
  }

  function removeLastColumn() {
    if (columns.length <= 2 || !lastColumn || lastColumn.blocks.length > 0) return;
    onChange({ ...block, data: { columns: columns.slice(0, -1) } });
  }

  return (
    <div className="grid gap-2 py-2">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(10rem, 100%), 1fr))" }}
      >
        {columns.map((column, index) => (
          <section
            key={column.id}
            aria-label={`Colonna ${index + 1}`}
            className="min-w-0 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] p-1"
          >
            <EditorialBlockEditor
              apiBaseUrl={apiBaseUrl}
              cms={cms}
              disabled={disabled}
              containerId={column.id}
              nested
              nestingLevel={nestingLevel + 1}
              value={{ version: 1, blocks: column.blocks }}
              onChange={(document) => updateColumn(column.id, document.blocks)}
            />
          </section>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1 px-1 text-xs text-[color:var(--color-ink-muted)]">
        <span className="mr-1">Layout · livello {nestingLevel + 1}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || columns.length >= 3}
          onClick={addColumn}
        >
          <Icon name="plus" className="h-3.5 w-3.5" /> Colonna
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          title={
            lastColumn?.blocks.length ? "Svuota l’ultima colonna prima di rimuoverla" : undefined
          }
          disabled={disabled || columns.length <= 2 || Boolean(lastColumn?.blocks.length)}
          onClick={removeLastColumn}
        >
          Rimuovi colonna
        </Button>
      </div>
    </div>
  );
}

function TableBlockFields({
  block,
  disabled,
  onChange
}: {
  block: Extract<StructuredContentBlock, { type: "table" }>;
  disabled: boolean;
  onChange: (block: StructuredContentBlock) => void;
}) {
  const rows = block.data.rows.length > 0 ? block.data.rows : [[""]];
  const columnCount = Math.max(1, rows[0]?.length ?? 1);

  function updateRows(nextRows: string[][]) {
    onChange({ ...block, data: { ...block.data, rows: nextRows } });
  }

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    updateRows(
      rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) =>
              currentColumnIndex === columnIndex ? value : cell
            )
          : row
      )
    );
  }

  function addRow() {
    updateRows([...rows, Array.from({ length: columnCount }, () => "")]);
  }

  function addColumn() {
    updateRows(rows.map((row) => [...row, ""]));
  }

  function focusCell(container: Element | null, rowIndex: number, columnIndex: number) {
    requestAnimationFrame(() => {
      container
        ?.querySelector<HTMLInputElement>(`[data-table-cell="${rowIndex}-${columnIndex}"]`)
        ?.focus();
    });
  }

  return (
    <div className="group/table grid gap-2 py-2" data-table-block>
      <div className="overflow-x-auto rounded-md border border-[color:var(--color-border)]">
        <table className="w-full min-w-[32rem] table-fixed border-collapse">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${block.id}-row-${rowIndex}`}>
                {row.map((cell, columnIndex) => {
                  const input = (
                    <input
                      key={`${rowIndex}-${columnIndex}-input`}
                      aria-label={`Riga ${rowIndex + 1}, colonna ${columnIndex + 1}`}
                      data-table-cell={`${rowIndex}-${columnIndex}`}
                      value={cell}
                      disabled={disabled}
                      className={`block h-10 w-full border-0 bg-transparent px-3 text-sm text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)] ${
                        block.data.hasHeader && rowIndex === 0 ? "font-semibold" : "font-normal"
                      }`}
                      placeholder={
                        block.data.hasHeader && rowIndex === 0
                          ? `Colonna ${columnIndex + 1}`
                          : undefined
                      }
                      onChange={(event) =>
                        updateCell(rowIndex, columnIndex, event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        const container = event.currentTarget.closest("[data-table-block]");
                        const nextRowIndex = rowIndex + 1;
                        if (nextRowIndex >= rows.length) addRow();
                        focusCell(container, nextRowIndex, columnIndex);
                      }}
                    />
                  );
                  const cellClass = `border-b border-r border-[color:var(--color-border)] last:border-r-0 ${
                    block.data.hasHeader && rowIndex === 0
                      ? "bg-[color:var(--color-surface-subtle)]"
                      : "bg-[color:var(--color-panel)]"
                  }`;
                  return block.data.hasHeader && rowIndex === 0 ? (
                    <th scope="col" className={cellClass} key={`${rowIndex}-${columnIndex}`}>
                      {input}
                    </th>
                  ) : (
                    <td className={cellClass} key={`${rowIndex}-${columnIndex}`}>
                      {input}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-1 opacity-70 transition group-hover/table:opacity-100 group-focus-within/table:opacity-100">
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={addRow}>
          <Icon name="plus" className="h-3.5 w-3.5" /> Riga
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={addColumn}>
          <Icon name="plus" className="h-3.5 w-3.5" /> Colonna
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || rows.length <= 1}
          onClick={() => updateRows(rows.slice(0, -1))}
        >
          Rimuovi riga
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || columnCount <= 1}
          onClick={() => updateRows(rows.map((row) => row.slice(0, -1)))}
        >
          Rimuovi colonna
        </Button>
      </div>
    </div>
  );
}

function ListBlockFields({
  block,
  disabled,
  onChange
}: {
  block: Extract<StructuredContentBlock, { type: "list" }>;
  disabled: boolean;
  onChange: (block: StructuredContentBlock) => void;
}) {
  const items = block.data.items.length > 0 ? block.data.items : [""];

  function updateItems(nextItems: string[]) {
    onChange({ ...block, data: { ...block.data, items: nextItems } });
  }

  return (
    <div className="grid gap-0.5 py-1" data-list-block>
      {items.map((item, index) => (
        <div className="flex min-h-7 items-start gap-2" key={`${block.id}-item-${index}`}>
          <span
            aria-hidden="true"
            className="w-5 shrink-0 select-none pt-0.5 text-right text-base leading-7 text-[color:var(--color-ink)]"
          >
            {block.data.style === "numbered" ? `${index + 1}.` : "•"}
          </span>
          <input
            aria-label={`Voce ${index + 1} dell’elenco`}
            data-list-item-index={index}
            placeholder={index === 0 ? "Voce dell’elenco" : undefined}
            value={item}
            disabled={disabled}
            className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0.5 text-base leading-7 text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)]"
            onChange={(event) => {
              const nextItems = [...items];
              nextItems[index] = event.currentTarget.value;
              updateItems(nextItems);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const container = event.currentTarget.closest("[data-list-block]");
                const nextItems = [...items];
                nextItems.splice(index + 1, 0, "");
                updateItems(nextItems);
                requestAnimationFrame(() => {
                  container
                    ?.querySelector<HTMLInputElement>(`[data-list-item-index="${index + 1}"]`)
                    ?.focus();
                });
              }
              if (event.key === "Backspace" && !item && items.length > 1) {
                event.preventDefault();
                const container = event.currentTarget.closest("[data-list-block]");
                const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
                updateItems(nextItems);
                requestAnimationFrame(() => {
                  container
                    ?.querySelector<HTMLInputElement>(
                      `[data-list-item-index="${Math.max(0, index - 1)}"]`
                    )
                    ?.focus();
                });
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}

function resolveMediaUrl(url: string, apiBaseUrl: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return url;
  const normalizedBase = apiBaseUrl.replace(/\/$/, "");
  return `${normalizedBase}${url.startsWith("/") ? url : `/${url}`}`;
}

export function blockAppearanceStyle(appearance?: BlockAppearance): CSSProperties {
  const textColor = colorValue(appearance?.textColor, "text");
  const backgroundColor = colorValue(appearance?.backgroundColor, "background");
  return {
    ...(textColor ? ({ "--color-ink": textColor } as CSSProperties) : {}),
    ...(textColor ? { color: textColor } : {}),
    ...(backgroundColor ? { backgroundColor } : {})
  };
}

function colorValue(color: BlockColor | undefined, mode: "text" | "background") {
  const option = BLOCK_COLORS.find((candidate) => candidate.key === color);
  return option?.[mode];
}

function createBlockId() {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `block-${uuid.replace(/[^a-z0-9_-]/gi, "").toLowerCase()}`;
}
