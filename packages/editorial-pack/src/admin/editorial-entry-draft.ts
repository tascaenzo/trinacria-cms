import {
  type StructuredDocument,
  toStructuredDocument
} from "../modules/entries/structured-document.contract.js";
import type { EditorialEntryRecord } from "./editorial-admin.types.js";

export interface EntryDraft {
  title: string;
  slug: string;
  body: StructuredDocument;
  data: Record<string, unknown>;
  reviewerUserId: string;
  scheduledAt: string;
}

export const EMPTY_ENTRY_DRAFT: EntryDraft = {
  title: "",
  slug: "",
  body: { version: 1, blocks: [] },
  data: {},
  reviewerUserId: "",
  scheduledAt: ""
};

export function toEntryDraft(entry: EditorialEntryRecord): EntryDraft {
  return {
    title: entry.title ?? "",
    slug: entry.slug ?? "",
    body: toStructuredDocument(entry.body),
    data: entry.data ?? {},
    reviewerUserId: entry.reviewerUserId ?? "",
    scheduledAt: toDateTimeLocal(entry.scheduledAt)
  };
}

export function toEntryUpdatePayload(entry: EditorialEntryRecord, draft: EntryDraft) {
  return {
    ...(draft.title.trim() ? { title: draft.title.trim() } : { clearTitle: true }),
    ...(draft.slug.trim() ? { slug: slugify(draft.slug) } : { clearSlug: true }),
    body: draft.body,
    data: draft.data,
    ...(draft.reviewerUserId.trim()
      ? { reviewerUserId: draft.reviewerUserId.trim() }
      : { clearReviewer: true }),
    ...(draft.scheduledAt
      ? { scheduledAt: new Date(draft.scheduledAt).toISOString() }
      : { clearScheduledAt: true }),
    ...(entry.version ? { expectedVersion: entry.version } : {})
  };
}

export function documentPlainText(document: StructuredDocument): string {
  return document.blocks
    .flatMap((block) => {
      if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") {
        return block.data.text;
      }
      if (block.type === "list") return block.data.items;
      if (block.type === "table") return block.data.rows.flat();
      if (block.type === "layout") {
        return block.data.columns.map((column) =>
          documentPlainText({ version: 1, blocks: column.blocks })
        );
      }
      if (block.type === "image") return block.data.caption ?? block.data.alt;
      return [];
    })
    .filter(Boolean)
    .join(" ");
}

function slugify(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toDateTimeLocal(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}
