import type { AdminAccessGuard } from "./access.js";
import type { AdminContributionMode, AdminJsonDataBinding } from "./endpoint.js";

export type AdminPageKind = "resource" | "document" | "dashboard" | "custom";

/**
 * Route metadata is framework-agnostic. It describes an admin feature surface
 * without forcing React-specific rendering concerns.
 */
export interface AdminRouteDefinition {
  id: string;
  path: string;
  pluginId: string;
  mode?: AdminContributionMode;
  kind?: AdminPageKind;
  title: string;
  titleKey?: string;
  summary?: string;
  summaryKey?: string;
  componentRef?: string;
  hideShellHeader?: boolean;
  data?: AdminJsonDataBinding;
  order?: number;
  guards?: readonly AdminAccessGuard[];
}
