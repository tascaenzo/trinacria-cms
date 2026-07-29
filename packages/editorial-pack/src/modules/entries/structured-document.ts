import { type Schema, s } from "@trinacria-cms/kernel";
import type { StructuredContentBlock } from "./structured-document.contract.js";

/**
 * Versioned, domain-owned document format for the editorial body.
 *
 * React components and editor implementation details deliberately do not appear
 * here: this contract is persisted, revisioned and can be rendered by any
 * consumer.
 */
const BlockIdSchema = s.string({
  trim: true,
  minLength: 1,
  maxLength: 120,
  pattern: /^[a-z0-9][a-z0-9_-]*$/
});
const BlockTextSchema = s.string({ maxLength: 50_000 });
const InlineTextSchema = s.object(
  {
    text: BlockTextSchema,
    bold: s.boolean().optional(),
    italic: s.boolean().optional(),
    code: s.boolean().optional(),
    link: s
      .object(
        {
          href: s.string({ trim: true, minLength: 1, maxLength: 2_000 }),
          entryId: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional()
        },
        { strict: true }
      )
      .optional()
  },
  { strict: true }
);
const RichTextDataSchema = s
  .object({ text: BlockTextSchema, inline: s.array(InlineTextSchema).optional() }, { strict: true })
  .refine(
    (value) =>
      value.inline === undefined ||
      value.inline.map((segment) => segment.text).join("") === value.text,
    "Inline text segments must match the plain text value",
    "invalid_inline_text"
  );
const BlockColorSchema = s.enum([
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red"
] as const);
const BlockAppearanceSchema = s.object(
  {
    textColor: BlockColorSchema.optional(),
    backgroundColor: BlockColorSchema.optional()
  },
  { strict: true }
);

export const ParagraphBlockSchema = s.object(
  {
    id: BlockIdSchema,
    type: s.literal("paragraph"),
    version: s.literal(1),
    appearance: BlockAppearanceSchema.optional(),
    data: RichTextDataSchema
  },
  { strict: true }
);

export const HeadingBlockSchema = s.object(
  {
    id: BlockIdSchema,
    type: s.literal("heading"),
    version: s.literal(1),
    appearance: BlockAppearanceSchema.optional(),
    data: s
      .object(
        {
          text: BlockTextSchema,
          inline: s.array(InlineTextSchema).optional(),
          level: s.union([s.literal(2), s.literal(3), s.literal(4)])
        },
        { strict: true }
      )
      .refine(
        (value) =>
          value.inline === undefined ||
          value.inline.map((segment) => segment.text).join("") === value.text,
        "Inline text segments must match the plain text value",
        "invalid_inline_text"
      )
  },
  { strict: true }
);

export const QuoteBlockSchema = s.object(
  {
    id: BlockIdSchema,
    type: s.literal("quote"),
    version: s.literal(1),
    appearance: BlockAppearanceSchema.optional(),
    data: s
      .object(
        {
          text: BlockTextSchema,
          inline: s.array(InlineTextSchema).optional(),
          citation: s.string({ trim: true, maxLength: 240 }).optional()
        },
        { strict: true }
      )
      .refine(
        (value) =>
          value.inline === undefined ||
          value.inline.map((segment) => segment.text).join("") === value.text,
        "Inline text segments must match the plain text value",
        "invalid_inline_text"
      )
  },
  { strict: true }
);

export const ImageBlockSchema = s.object(
  {
    id: BlockIdSchema,
    type: s.literal("image"),
    version: s.literal(1),
    appearance: BlockAppearanceSchema.optional(),
    data: s.object(
      {
        src: s.string({ trim: true, maxLength: 2_000 }),
        alt: s.string({ trim: true, maxLength: 500 }),
        assetId: s.string({ trim: true, maxLength: 120 }).optional(),
        caption: s.string({ trim: true, maxLength: 1_000 }).optional()
      },
      { strict: true }
    )
  },
  { strict: true }
);

export const ListBlockSchema = s.object(
  {
    id: BlockIdSchema,
    type: s.literal("list"),
    version: s.literal(1),
    appearance: BlockAppearanceSchema.optional(),
    data: s.object(
      {
        style: s.enum(["bulleted", "numbered"] as const),
        items: s.array(BlockTextSchema)
      },
      { strict: true }
    )
  },
  { strict: true }
);

export const TableBlockSchema = s
  .object(
    {
      id: BlockIdSchema,
      type: s.literal("table"),
      version: s.literal(1),
      appearance: BlockAppearanceSchema.optional(),
      data: s.object(
        {
          hasHeader: s.boolean(),
          rows: s.array(s.array(BlockTextSchema))
        },
        { strict: true }
      )
    },
    { strict: true }
  )
  .refine(
    (block) => {
      const columnCount = block.data.rows[0]?.length ?? 0;
      return (
        block.data.rows.length > 0 &&
        columnCount > 0 &&
        block.data.rows.every((row) => row.length === columnCount)
      );
    },
    "Table rows must form a non-empty rectangular grid",
    "invalid_table_grid"
  );

export const DividerBlockSchema = s.object(
  {
    id: BlockIdSchema,
    type: s.literal("divider"),
    version: s.literal(1),
    appearance: BlockAppearanceSchema.optional(),
    data: s.object({}, { strict: true })
  },
  { strict: true }
);

const LeafContentBlockSchema = s.union([
  ParagraphBlockSchema,
  HeadingBlockSchema,
  QuoteBlockSchema,
  ImageBlockSchema,
  ListBlockSchema,
  TableBlockSchema,
  DividerBlockSchema
]);

function createLayoutBlockSchema<TBlock>(childBlockSchema: Schema<TBlock>) {
  return s
    .object(
      {
        id: BlockIdSchema,
        type: s.literal("layout"),
        version: s.literal(1),
        appearance: BlockAppearanceSchema.optional(),
        data: s.object(
          {
            columns: s.array(
              s.object(
                {
                  id: BlockIdSchema,
                  blocks: s.array(childBlockSchema)
                },
                { strict: true }
              )
            )
          },
          { strict: true }
        )
      },
      { strict: true }
    )
    .refine(
      (block) =>
        block.data.columns.length >= 2 &&
        block.data.columns.length <= 3 &&
        new Set(block.data.columns.map((column) => column.id)).size === block.data.columns.length,
      "Layouts must contain two or three uniquely identified columns",
      "invalid_layout_columns"
    );
}

const NestedLayoutLevel3Schema = createLayoutBlockSchema(LeafContentBlockSchema);
const NestedContentLevel2Schema = s.union([
  ParagraphBlockSchema,
  HeadingBlockSchema,
  QuoteBlockSchema,
  ImageBlockSchema,
  ListBlockSchema,
  TableBlockSchema,
  DividerBlockSchema,
  NestedLayoutLevel3Schema
]);
const NestedLayoutLevel2Schema = createLayoutBlockSchema(NestedContentLevel2Schema);
const NestedContentLevel1Schema = s.union([
  ParagraphBlockSchema,
  HeadingBlockSchema,
  QuoteBlockSchema,
  ImageBlockSchema,
  ListBlockSchema,
  TableBlockSchema,
  DividerBlockSchema,
  NestedLayoutLevel2Schema
]);

export const LayoutBlockSchema = createLayoutBlockSchema(NestedContentLevel1Schema);
export const StructuredContentBlockSchema = s.union([
  ParagraphBlockSchema,
  HeadingBlockSchema,
  QuoteBlockSchema,
  ImageBlockSchema,
  ListBlockSchema,
  TableBlockSchema,
  DividerBlockSchema,
  LayoutBlockSchema
]);

export const StructuredDocumentSchema = s
  .object(
    {
      version: s.literal(1),
      blocks: s.array(StructuredContentBlockSchema)
    },
    { strict: true }
  )
  .refine(
    (document) => {
      const blockIds = collectBlockIds(document.blocks as StructuredContentBlock[]);
      return new Set(blockIds).size === blockIds.length;
    },
    "Block ids must be unique",
    "duplicate_block_id"
  );

export const LegacyTextBodySchema = s.object({ text: BlockTextSchema }, { strict: true });

export const EntryBodySchema = s.union([StructuredDocumentSchema, LegacyTextBodySchema]);

function collectBlockIds(blocks: readonly StructuredContentBlock[]): string[] {
  return blocks.flatMap((block) => [
    block.id,
    ...(block.type === "layout"
      ? block.data.columns.flatMap((column) => collectBlockIds(column.blocks))
      : [])
  ]);
}
