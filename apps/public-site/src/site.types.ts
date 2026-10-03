export interface SiteEntry {
  id: string;
  contentTypeKey: string;
  title?: string;
  slug?: string;
  publishedAt?: string;
  body?: { text?: string; blocks?: SiteBlock[] };
  data: Record<string, unknown>;
}
export interface SiteBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
}
export interface SiteProps {
  title: string;
  description: string;
  canonical: string;
  preview: boolean;
  navigation: { label: string; href: string }[];
  entries?: SiteEntry[];
  entry?: SiteEntry;
  error?: string;
  next?: string;
}
export function safeLink(value: unknown): string | undefined {
  if (typeof value !== "string" || /[\u0000-\u0020\u007f\\]/.test(value)) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return value;
  } catch {}
  return undefined;
}
export function entryPath(entry: Pick<SiteEntry, "contentTypeKey" | "slug">) {
  const slug = encodeURIComponent(entry.slug ?? "");
  return entry.contentTypeKey === "article"
    ? `/articles/${slug}`
    : entry.contentTypeKey === "page"
      ? `/pages/${slug}`
      : `/content/${encodeURIComponent(entry.contentTypeKey)}/${slug}`;
}
