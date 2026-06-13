import type { AdminAccessGuard } from "./access.js";
import type { AdminEndpointBinding } from "./endpoint.js";

export type AdminActionIntent = "create" | "read" | "update" | "delete" | "custom";

export interface AdminActionDefinition {
  id: string;
  pluginId?: string;
  intent: AdminActionIntent;
  title: string;
  titleKey?: string;
  summary?: string;
  summaryKey?: string;
  endpoint: AdminEndpointBinding;
  input?: {
    schema?: unknown;
    valuePath?: string;
  };
  order?: number;
  guards?: readonly AdminAccessGuard[];
}
