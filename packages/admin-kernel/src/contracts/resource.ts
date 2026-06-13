import type { AdminAccessGuard } from "./access.js";
import type { AdminActionDefinition } from "./action.js";

export interface AdminResourceFieldDefinition {
  key: string;
  label: string;
  labelKey?: string;
  kind?: "text" | "status" | "datetime" | "json" | "secret";
  primary?: boolean;
  table?: boolean;
  form?: boolean;
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
  actions?: readonly AdminActionDefinition[];
  guards?: readonly AdminAccessGuard[];
}
