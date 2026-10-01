import { DropIndicator } from "@trinacria-cms/trinacria-ui";
import { createContext, type DragEvent as ReactDragEvent, useContext, useState } from "react";
import {
  createStructuredContentBlock,
  type StructuredContentBlock,
  type StructuredContentBlockType,
  type StructuredDocument
} from "../modules/entries/structured-document.contract.js";
import {
  moveStructuredContentBlock,
  moveStructuredContentBlockToContainer
} from "../modules/entries/structured-document.operations.js";
import {
  BlockPicker,
  EditableBlock,
  PhantomBlock
} from "./block-editor/block-editor.components.js";
import { BLOCK_TYPES, createBlockId } from "./block-editor/block-editor.metadata.js";
import type { CmsClient } from "./editorial-admin.types.js";

export { blockAppearanceStyle } from "./block-editor/block-editor.metadata.js";

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
        nested
          ? "w-full min-w-0 px-1 py-2"
          : "mx-auto w-full max-w-3xl px-5 pb-32 pt-24 sm:px-10 sm:pt-10"
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
