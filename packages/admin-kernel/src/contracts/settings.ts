import type { AdminAccessGuard } from "./access.js";
import type { AdminActionDefinition } from "./action.js";
import type { AdminContributionMode, AdminJsonDataBinding } from "./endpoint.js";

export type AdminSettingsSectionKind = "form" | "panel" | "custom";

/**
 * Settings sections let plugins project configuration pages into a shared
 * settings area while remaining logically isolated.
 */
export interface AdminSettingsSectionDefinition {
  id: string;
  pluginId: string;
  mode?: AdminContributionMode;
  kind?: AdminSettingsSectionKind;
  componentRef?: string;
  title: string;
  titleKey?: string;
  summary?: string;
  summaryKey?: string;
  category?: string;
  settingKeys?: readonly string[];
  data?: AdminJsonDataBinding;
  actions?: readonly AdminActionDefinition[];
  order?: number;
  guards?: readonly AdminAccessGuard[];
}
