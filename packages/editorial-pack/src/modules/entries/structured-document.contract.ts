/**
 * Framework-independent types and helpers for the persisted editorial document.
 * They are safe to import from both the server and the browser.
 */
export type BlockColor =
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

export interface BlockAppearance {
  textColor?: BlockColor;
  backgroundColor?: BlockColor;
}

/** Inline formatting is stored as data, never as executable or arbitrary HTML. */
export interface InlineText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  /** A validated absolute URL or an editorial entry reference. */
  link?: { href: string; entryId?: string };
}

export interface RichTextData {
  text: string;
  /** Optional for backwards compatibility with V1 plain-text documents. */
  inline?: InlineText[];
}

export interface ParagraphBlock {
  id: string;
  type: "paragraph";
  version: 1;
  appearance?: BlockAppearance;
  data: RichTextData;
}

export interface HeadingBlock {
  id: string;
  type: "heading";
  version: 1;
  appearance?: BlockAppearance;
  data: RichTextData & { level: 2 | 3 | 4 };
}

export interface QuoteBlock {
  id: string;
  type: "quote";
  version: 1;
  appearance?: BlockAppearance;
  data: RichTextData & { citation?: string };
}

export interface ImageBlock {
  id: string;
  type: "image";
  version: 1;
  appearance?: BlockAppearance;
  data: { src: string; alt: string; assetId?: string; caption?: string };
}

export interface ListBlock {
  id: string;
  type: "list";
  version: 1;
  appearance?: BlockAppearance;
  data: { style: "bulleted" | "numbered"; items: string[] };
}

export interface TableBlock {
  id: string;
  type: "table";
  version: 1;
  appearance?: BlockAppearance;
  data: { rows: string[][]; hasHeader: boolean };
}

export interface LayoutColumn {
  id: string;
  blocks: StructuredContentBlock[];
}

export interface LayoutBlock {
  id: string;
  type: "layout";
  version: 1;
  appearance?: BlockAppearance;
  data: { columns: LayoutColumn[] };
}

export interface DividerBlock {
  id: string;
  type: "divider";
  version: 1;
  appearance?: BlockAppearance;
  data: Record<string, never>;
}

export type StructuredContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | QuoteBlock
  | ImageBlock
  | ListBlock
  | TableBlock
  | LayoutBlock
  | DividerBlock;

export type StructuredContentBlockType = StructuredContentBlock["type"];

export interface StructuredDocument {
  version: 1;
  blocks: StructuredContentBlock[];
}

/** Kept read-compatible while existing plain-text entries are progressively saved again. */
export interface LegacyTextBody {
  text: string;
}

export type EntryBody = StructuredDocument | LegacyTextBody;

export function createEmptyStructuredDocument(): StructuredDocument {
  return { version: 1, blocks: [] };
}

export function createStructuredContentBlock(
  type: StructuredContentBlockType,
  id: string
): StructuredContentBlock {
  if (type === "heading") return { id, type, version: 1, data: { text: "", level: 2 } };
  if (type === "quote") return { id, type, version: 1, data: { text: "" } };
  if (type === "image") return { id, type, version: 1, data: { src: "", alt: "" } };
  if (type === "list") return { id, type, version: 1, data: { style: "bulleted", items: [""] } };
  if (type === "table") {
    return {
      id,
      type,
      version: 1,
      data: {
        hasHeader: true,
        rows: [
          ["Colonna 1", "Colonna 2"],
          ["", ""]
        ]
      }
    };
  }
  if (type === "layout") {
    return {
      id,
      type,
      version: 1,
      data: {
        columns: [
          { id: `${id}-column-1`, blocks: [] },
          { id: `${id}-column-2`, blocks: [] }
        ]
      }
    };
  }
  if (type === "divider") return { id, type, version: 1, data: {} };
  return { id, type: "paragraph", version: 1, data: { text: "" } };
}

/** Converts a legacy `{ text }` value in memory; the stored value changes only on save. */
export function toStructuredDocument(body?: EntryBody): StructuredDocument {
  if (!body) return createEmptyStructuredDocument();
  if ("blocks" in body) return body;
  const text = body.text.trim();
  return text
    ? {
        version: 1,
        blocks: [{ id: "legacy-body-1", type: "paragraph", version: 1, data: { text } }]
      }
    : createEmptyStructuredDocument();
}
