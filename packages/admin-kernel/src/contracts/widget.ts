import type { AdminAccessGuard } from "./access.js";
import type { AdminContributionMode, AdminJsonDataBinding } from "./endpoint.js";

export type AdminDashboardWidgetKind = "metric" | "status" | "card" | "list" | "chart" | "custom";

/** Dashboard widgets are plugin-contributed summaries mounted in overview screens. */
export interface AdminDashboardWidgetDefinition {
  id: string;
  pluginId: string;
  mode?: AdminContributionMode;
  kind?: AdminDashboardWidgetKind;
  componentRef?: string;
  title: string;
  titleKey?: string;
  summary?: string;
  summaryKey?: string;
  data?: AdminJsonDataBinding;
  layout?: {
    columnSpan?: 1 | 2 | 3 | 4;
    minHeight?: "sm" | "md" | "lg";
  };
  order?: number;
  guards?: readonly AdminAccessGuard[];
}
