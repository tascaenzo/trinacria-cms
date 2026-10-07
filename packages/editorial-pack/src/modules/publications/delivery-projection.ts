import type { ContentTypeRecord } from "../content-types/content-types.schemas.js";
import type { EntryRecord } from "../entries/entries.schemas.js";
import type { StructuredContentBlock } from "../entries/structured-document.contract.js";

/** Only an explicit projection can cross the public/preview boundary. */
export async function deliveryProjection(
  type: ContentTypeRecord,
  entry: EntryRecord,
  relation: (targetTypeId: string, id: string) => Promise<unknown | null>
) {
  const config = type.delivery!;
  const data: Record<string, unknown> = {};
  for (const key of config.publicFields) {
    const field = type.fields.find((candidate) => candidate.key === key),
      value = entry.data[key];
    if (!field || value === undefined || value === null) continue;
    const values = field.multiple ? (value as unknown[]) : [value];
    if (field.type === "relation") {
      const related: unknown[] = [];
      for (const id of values) {
        if (typeof id !== "string" || !field.config?.targetContentTypeId) continue;
        const result = await relation(field.config.targetContentTypeId, id);
        if (result) related.push(result);
      }
      if (field.multiple) data[key] = related;
      else if (related[0]) data[key] = related[0];
    } else if (field.type === "media") {
      const media = values.map((assetId) => ({
        assetId,
        url: `/v1/delivery/media/${encodeURIComponent(String(assetId))}`
      }));
      data[key] = field.multiple ? media : media[0];
    } else data[key] = structuredClone(value);
  }
  const body = config.exposeBody ? structuredClone(entry.body) : undefined;
  if (body && "blocks" in body) {
    const rewrite = (blocks: StructuredContentBlock[]) => {
      for (const block of blocks) {
        if (block.type === "image")
          block.data.src = `/v1/delivery/media/${encodeURIComponent(block.data.assetId!)}`;
        if (block.type === "layout")
          for (const column of block.data.columns) rewrite(column.blocks);
      }
    };
    rewrite(body.blocks);
  }
  return {
    id: entry.id,
    contentTypeKey: type.key,
    ...(config.exposeTitle && entry.title ? { title: entry.title } : {}),
    ...(config.exposeSlug ? { slug: entry.slug } : {}),
    ...(body ? { body } : {}),
    data
  };
}
