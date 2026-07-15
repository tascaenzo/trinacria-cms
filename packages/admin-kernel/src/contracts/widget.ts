import type { AdminAccessGuard } from "./access.js";
import type { AdminContributionMode, AdminJsonDataBinding } from "./endpoint.js";

export type AdminDashboardWidgetKind = "metric" | "status" | "card" | "list" | "chart" | "custom";

export interface AdminDashboardWidgetLayout {
  /** Default width in the four-column desktop dashboard grid. */
  defaultColumnSpan?: 1 | 2 | 3 | 4;
  /** Default height in dashboard grid rows. */
  defaultRowSpan?: 1 | 2 | 3;
  /** @deprecated Use defaultColumnSpan for new widget declarations. */
  columnSpan?: 1 | 2 | 3 | 4;
  /** @deprecated Use defaultRowSpan for new widget declarations. */
  rowSpan?: 1 | 2 | 3;
  /** Optional lower width bound enforced while users resize a widget. */
  minColumnSpan?: 1 | 2 | 3 | 4;
  /** Optional upper width bound enforced while users resize a widget. */
  maxColumnSpan?: 1 | 2 | 3 | 4;
  /** Optional lower height bound enforced while users resize a widget. */
  minRowSpan?: 1 | 2 | 3;
  /** Optional upper height bound enforced while users resize a widget. */
  maxRowSpan?: 1 | 2 | 3;
}

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
  layout?: AdminDashboardWidgetLayout;
  order?: number;
  guards?: readonly AdminAccessGuard[];
}
