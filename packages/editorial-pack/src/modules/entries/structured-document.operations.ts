import type { StructuredContentBlock, StructuredDocument } from "./structured-document.contract.js";

/** Reorders a root-level block using an insertion point in the original document. */
export function moveStructuredContentBlock(
  document: StructuredDocument,
  blockId: string,
  insertionIndex: number
): StructuredDocument {
  const sourceIndex = document.blocks.findIndex((block) => block.id === blockId);
  if (sourceIndex < 0) return document;
  const blocks = [...document.blocks];
  const [block] = blocks.splice(sourceIndex, 1);
  if (!block) return document;
  const targetIndex = Math.max(
    0,
    Math.min(sourceIndex < insertionIndex ? insertionIndex - 1 : insertionIndex, blocks.length)
  );
  blocks.splice(targetIndex, 0, block);
  return { ...document, blocks };
}

/** Moves a block between the root canvas and any layout column, preserving the document tree. */
export function moveStructuredContentBlockToContainer(
  document: StructuredDocument,
  blockId: string,
  containerId: string,
  insertionIndex: number
): StructuredDocument {
  const extracted = extractStructuredBlock(document.blocks, blockId);
  if (!extracted.block) return document;
  const inserted = insertStructuredBlock(
    extracted.blocks,
    containerId,
    insertionIndex,
    extracted.block
  );
  return inserted.found ? { ...document, blocks: inserted.blocks } : document;
}

function extractStructuredBlock(
  blocks: readonly StructuredContentBlock[],
  blockId: string
): { blocks: StructuredContentBlock[]; block?: StructuredContentBlock } {
  let extracted: StructuredContentBlock | undefined;
  const next: StructuredContentBlock[] = [];
  for (const block of blocks) {
    if (block.id === blockId) {
      extracted = block;
      continue;
    }
    if (block.type !== "layout") {
      next.push(block);
      continue;
    }
    const columns = block.data.columns.map((column) => {
      if (extracted) return column;
      const result = extractStructuredBlock(column.blocks, blockId);
      if (result.block) extracted = result.block;
      return { ...column, blocks: result.blocks };
    });
    next.push({ ...block, data: { ...block.data, columns } });
  }
  return { blocks: next, ...(extracted ? { block: extracted } : {}) };
}

function insertStructuredBlock(
  blocks: readonly StructuredContentBlock[],
  containerId: string,
  insertionIndex: number,
  block: StructuredContentBlock
): { blocks: StructuredContentBlock[]; found: boolean } {
  if (containerId === "root") {
    const next = [...blocks];
    next.splice(Math.max(0, Math.min(insertionIndex, next.length)), 0, block);
    return { blocks: next, found: true };
  }
  let found = false;
  const next = blocks.map((candidate) => {
    if (candidate.type !== "layout" || found) return candidate;
    const columns = candidate.data.columns.map((column) => {
      if (found) return column;
      if (column.id === containerId) {
        const nested = [...column.blocks];
        nested.splice(Math.max(0, Math.min(insertionIndex, nested.length)), 0, block);
        found = true;
        return { ...column, blocks: nested };
      }
      const inserted = insertStructuredBlock(column.blocks, containerId, insertionIndex, block);
      if (inserted.found) found = true;
      return inserted.found ? { ...column, blocks: inserted.blocks } : column;
    });
    return { ...candidate, data: { ...candidate.data, columns } };
  });
  return { blocks: next, found };
}
