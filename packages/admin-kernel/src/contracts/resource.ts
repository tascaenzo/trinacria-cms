import type { AdminAccessGuard } from "./access.js";
import type { AdminActionDefinition } from "./action.js";

export interface AdminResourceFieldDefinition {
  key: string;
  label: string;
  labelKey?: string;
  kind?: "text" | "status" | "datetime" | "json" | "secret" | "tags";
  primary?: boolean;
  table?: boolean;
  form?: boolean;
}

export interface AdminResourceDetailSectionDefinition {
  id: string;
  title: string;
  titleKey?: string;
  fields?: readonly string[];
}

export interface AdminResourceDetailDefinition {
  title?: string;
  titleKey?: string;
  titleField?: string;
  subtitleField?: string;
  fields?: readonly string[];
  sections?: readonly AdminResourceDetailSectionDefinition[];
  showJson?: boolean;
}

/**
 * Resource definitions describe administrable data surfaces independently from
 * the concrete React page that renders them.
 */
export interface AdminResourceDefinition {
  id: string;
  pluginId: string;
  entityName: string;
  routeId?: string;
  title: string;
  titleKey?: string;
  summary?: string;
  summaryKey?: string;
  order?: number;
  capabilities?: {
    list?: string;
    read?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
  fields?: readonly AdminResourceFieldDefinition[];
  detail?: AdminResourceDetailDefinition | false;
  actions?: readonly AdminActionDefinition[];
  guards?: readonly AdminAccessGuard[];
}
