import {
  Button,
  ColorSwatchGrid,
  Icon,
  IconButton,
  IconTile,
  OverlaySurface,
  SearchField,
  SelectableCard,
  Toolbar,
  ToolbarButton,
  ToolbarSelect
} from "@trinacria-cms/trinacria-ui";
import { type DragEvent as ReactDragEvent, useEffect, useRef, useState } from "react";
import type {
  BlockAppearance,
  BlockColor,
  StructuredContentBlock,
  StructuredContentBlockType
} from "../../modules/entries/structured-document.contract.js";
import type { CmsClient } from "../editorial-admin.types.js";
import { EditorialBlockEditor } from "../editorial-block-editor.js";
import { RichTextEditor } from "../editorial-rich-text.js";
import {
  BLOCK_COLORS,
  BLOCK_META,
  blockAppearanceStyle,
  colorValue,
  createBlockId
} from "./block-editor.metadata.js";
import { ListBlockFields, TableBlockFields } from "./collection-block-fields.js";
import { ImageBlockFields } from "./image-block-fields.js";
export function BlockPicker({
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
    <OverlaySurface
      className="absolute left-10 top-2 w-[20rem] max-w-[calc(100vw-3rem)] overflow-hidden"
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
      <div className="border-b border-(--color-border) p-2">
        <SearchField
          ref={searchInputRef}
          searchLabel="Cerca un blocco"
          placeholder="Cerca un blocco"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-1.5">
        <p className="px-2 pb-1 pt-1 text-[11px] font-medium text-(--color-ink-subtle)">
          Blocchi base
        </p>
        {filteredTypes.map((type) => (
          <SelectableCard
            padding="sm"
            key={type}
            type="button"
            disabled={disabled}
            className="flex items-center gap-3"
            onClick={() => onSelect(type)}
          >
            <IconTile icon={BLOCK_META[type].icon} size="sm" />
            <span>
              <span className="block text-sm font-medium text-(--color-ink)">
                {BLOCK_META[type].label}
              </span>
              <span className="block truncate text-xs text-(--color-ink-muted)">
                {BLOCK_META[type].description}
              </span>
            </span>
          </SelectableCard>
        ))}
        {!filteredTypes.length ? (
          <p className="px-3 py-6 text-center text-sm text-(--color-ink-muted)">
            Nessun blocco trovato
          </p>
        ) : null}
      </div>
    </OverlaySurface>
  );
}

export function PhantomBlock({
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
      <IconButton
        icon="plus"
        label="Aggiungi un blocco"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="absolute left-1 top-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        onClick={onOpenPicker}
      />
      <textarea
        rows={1}
        aria-label="Nuovo paragrafo"
        placeholder="Scrivi qualcosa oppure premi / per i comandi"
        value={text}
        disabled={disabled}
        className="block min-h-10 w-full border-0 bg-transparent px-1 py-1.5 text-base leading-7 text-(--color-ink) outline-hidden placeholder:text-(--color-ink-subtle)"
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

export function EditableBlock({
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
        <IconButton
          icon="plus"
          size="sm"
          variant="ghost"
          label="Inserisci blocco dopo"
          disabled={disabled}
          onClick={onInsert}
        />
        <IconButton
          icon="grip-vertical"
          size="sm"
          variant="ghost"
          draggable={!disabled}
          className="cursor-grab active:cursor-grabbing"
          label={`Trascina blocco ${BLOCK_META[block.type].label}`}
          disabled={disabled}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      </div>

      <Toolbar
        label="Azioni blocco"
        hiddenUntilFocus
        className="absolute -top-10 right-2 z-10 group-hover:flex group-focus-within:flex"
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
      </Toolbar>

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
      <ToolbarSelect
        label="Livello del titolo"
        value={String(block.data.level)}
        disabled={disabled}
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
      </ToolbarSelect>
    );
  }
  if (block.type === "list") {
    return (
      <ToolbarSelect
        label="Stile elenco"
        value={block.data.style}
        disabled={disabled}
        onChange={(event) =>
          onChange({
            ...block,
            data: { ...block.data, style: event.currentTarget.value as "bulleted" | "numbered" }
          })
        }
      >
        <option value="bulleted">Punti</option>
        <option value="numbered">Numeri</option>
      </ToolbarSelect>
    );
  }
  if (block.type === "table") {
    return (
      <ToolbarButton
        label="Intestazione"
        disabled={disabled}
        aria-pressed={block.data.hasHeader}
        onClick={() =>
          onChange({ ...block, data: { ...block.data, hasHeader: !block.data.hasHeader } })
        }
      >
        Intestazione
      </ToolbarButton>
    );
  }
  return (
    <span className="px-1.5 text-[11px] font-medium text-(--color-ink-subtle)">
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
      <ToolbarButton
        label="Colori del blocco"
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
      </ToolbarButton>
      {open ? (
        <OverlaySurface className="absolute right-0 top-10 z-50 w-64 p-3">
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
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start"
            onClick={() => {
              onChange({});
              onOpenChange(false);
            }}
          >
            Ripristina colori
          </Button>
        </OverlaySurface>
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
        className="block min-h-10 w-full resize-y border-0 bg-transparent px-1 py-1.5 text-base leading-7 text-(--color-ink) outline-hidden placeholder:text-(--color-ink-subtle)"
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
        className={`block min-h-11 w-full resize-none border-0 bg-transparent px-1 py-1 font-semibold leading-tight text-(--color-ink) outline-hidden placeholder:text-(--color-ink-subtle) ${
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
      <div className="border-l-4 border-(--color-ink-subtle) py-1 pl-4">
        <RichTextEditor
          ariaLabel="Citazione"
          autoFocus={autoFocus}
          rows={2}
          placeholder="Scrivi una citazione"
          disabled={disabled}
          className="block w-full resize-y border-0 bg-transparent px-1 py-1 text-lg italic leading-7 text-(--color-ink) outline-hidden placeholder:text-(--color-ink-subtle)"
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
          className="block w-full border-0 bg-transparent px-1 py-1 text-sm text-(--color-ink-muted) outline-hidden placeholder:text-(--color-ink-subtle)"
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
  return <hr className="my-5 border-(--color-border)" aria-label="Separatore" />;
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
            className="min-w-0 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) p-1"
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
      <div className="flex flex-wrap items-center gap-1 px-1 text-xs text-(--color-ink-muted)">
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
