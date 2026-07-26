import type { AdminAccessGuard } from "./access.js";

/**
 * Navigation items point to a route and carry presentational hints used by the
 * shell to group and order links.
 */
export interface AdminNavigationItem {
  id: string;
  routeId: string;
  title: string;
  titleKey?: string;
  icon?: string;
  group?: string;
  groupKey?: string;
  badge?: string;
  order?: number;
  /** Optional query parameters to apply when opening the route. */
  params?: Readonly<Record<string, string>>;
  guards?: readonly AdminAccessGuard[];
}
