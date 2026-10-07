import { s } from "@trinacria-cms/kernel";
import { isPublicUrl } from "./publication-validation.js";

export const PUBLIC_NAVIGATION_SETTING = "editorial-pack:site:navigation";
export const NavigationItemsSchema = s.array(
  s
    .object(
      {
        label: s.string({ trim: true, minLength: 1, maxLength: 120 }),
        href: s.string({ maxLength: 500 }).optional(),
        contentTypeKey: s.string({ pattern: /^[a-z][a-z0-9-]{1,79}$/ }).optional(),
        slug: s.string({ maxLength: 200 }).optional()
      },
      { strict: true }
    )
    .refine(
      (item) =>
        item.href !== undefined
          ? !item.contentTypeKey &&
            !item.slug &&
            isPublicUrl(item.href) &&
            (item.href === "/" || /^https?:/.test(item.href))
          : !!item.contentTypeKey && !!item.slug,
      "Navigation requires a safe external/home link or a published content target",
      "invalid_navigation_target"
    ),
  { maxItems: 50 }
);
export function publicEntryPath(key: string, slug: string) {
  return key === "article"
    ? `/articles/${encodeURIComponent(slug)}`
    : key === "page"
      ? `/pages/${encodeURIComponent(slug)}`
      : `/content/${encodeURIComponent(key)}/${encodeURIComponent(slug)}`;
}
