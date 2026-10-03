import { s } from "@trinacria-cms/kernel";

const PaginationSchema = s.object(
  { limit: s.number({ int: true, min: 1, max: 100 }), offset: s.number({ int: true, min: 0 }) },
  { strict: true }
);
export function editorialPagination(options: { limit?: number; offset?: number }) {
  return PaginationSchema.parse({ limit: options.limit ?? 100, offset: options.offset ?? 0 });
}
export function editorialPaginationFromQuery(query: Record<string, string | string[]>) {
  const numeric = (value: string | string[] | undefined): number | undefined =>
    value === undefined
      ? undefined
      : Array.isArray(value) || !value.trim()
        ? Number.NaN
        : Number(value);
  return editorialPagination({ limit: numeric(query.limit), offset: numeric(query.offset) });
}
