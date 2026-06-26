import type { AdminAccessGuard } from "./access.js";
import type { AdminEndpointBinding, AdminEndpointPolicyHint } from "./endpoint.js";

export type AdminActionIntent = "create" | "read" | "update" | "delete" | "custom";

export type AdminRecordGuardOperator = "equals" | "notEquals" | "in" | "notIn";

export interface AdminRecordGuard {
  field: string;
  operator: AdminRecordGuardOperator;
  value?: string | number | boolean | null;
  values?: readonly (string | number | boolean | null)[];
}

export interface AdminActionDefinition {
  id: string;
  pluginId?: string;
  intent: AdminActionIntent;
  title: string;
  titleKey?: string;
  endpoint: AdminEndpointBinding;
  input?: {
    schema?: unknown;
    valuePath?: string;
  };
  policy?: AdminEndpointPolicyHint;
  order?: number;
  guards?: readonly AdminAccessGuard[];
  recordGuards?: readonly AdminRecordGuard[];
}
