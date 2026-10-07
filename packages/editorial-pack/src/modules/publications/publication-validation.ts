import type { MediaAssetsService } from "@trinacria-cms/media-pack/runtime";
import type { ContentTypeRecord } from "../content-types/content-types.schemas.js";
import type { EntryRecord } from "../entries/entries.schemas.js";
import type { StructuredContentBlock } from "../entries/structured-document.contract.js";

export class PublicationValidationError extends Error {
  readonly code = "validation_error";
}
export function isPublicUrl(value: string): boolean {
  // Browsers discard controls and normalize backslashes before resolving URLs.
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
export async function validatePublicationContent(
  type: ContentTypeRecord,
  entry: EntryRecord,
  media?: Pick<MediaAssetsService, "validateUse">
) {
  const config = type.delivery;
  if (!config?.enabled) return;
  if (!entry.slug) throw new PublicationValidationError("Public delivery requires a slug");
  const assets = new Set<string>();
  let blockCount = 0;
  const validateBlocks = (blocks: readonly StructuredContentBlock[], depth = 0) => {
    if (depth > 8) throw new PublicationValidationError("Public body nesting exceeds the limit");
    for (const block of blocks) {
      if (
        ++blockCount > 500 ||
        !["paragraph", "heading", "quote", "image", "list", "table", "layout", "divider"].includes(
          block.type
        )
      )
        throw new PublicationValidationError("Unsupported or oversized public body");
      if (block.type === "image") {
        if (!block.data.assetId)
          throw new PublicationValidationError("Public images require a Media asset reference");
        assets.add(block.data.assetId);
      }
      if (block.type === "layout")
        for (const column of block.data.columns) validateBlocks(column.blocks, depth + 1);
      if (block.type === "paragraph" || block.type === "heading" || block.type === "quote")
        for (const segment of block.data.inline ?? [])
          if (segment.link && !isPublicUrl(segment.link.href))
            throw new PublicationValidationError("Unsafe public link");
    }
  };
  if (config.exposeBody && entry.body && "blocks" in entry.body) validateBlocks(entry.body.blocks);
  for (const key of config.publicFields) {
    const field = type.fields.find((candidate) => candidate.key === key);
    if (!field) throw new PublicationValidationError("Unknown public field");
    const value = entry.data[key];
    if (value === undefined || value === null) continue;
    const values = field.multiple ? (value as unknown[]) : [value];
    if (field.type === "media")
      for (const asset of values) {
        if (typeof asset !== "string" || !asset)
          throw new PublicationValidationError("Invalid public media field");
        assets.add(asset);
      }
    if (field.type === "url")
      for (const link of values)
        if (typeof link !== "string" || !isPublicUrl(link))
          throw new PublicationValidationError("Unsafe public URL field");
  }
  if (assets.size > 100)
    throw new PublicationValidationError("Public media reference limit exceeded");
  if (assets.size) {
    if (!media) throw new PublicationValidationError("Public Media validation unavailable");
    const results = await media.validateUse({
      references: [...assets].map((assetId) => ({ assetId })),
      actor: {},
      purpose: "publication"
    });
    if (results.length !== assets.size || results.some((result) => !result.usable))
      throw new PublicationValidationError("Referenced Media must be ready and public");
  }
}
