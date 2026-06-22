import type { AdminEndpointBinding, AdminEndpointPolicyHint } from "../contracts.js";

export type DeclarativeDataState =
  | { status: "idle"; data?: undefined; error?: undefined }
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: unknown; error?: undefined }
  | { status: "error"; data?: undefined; error: string };

export type DeclarativeDataController = DeclarativeDataState & {
  refetch: () => void;
};

export type DeclarativeActionState =
  | { status: "idle"; error?: undefined; response?: undefined }
  | { status: "submitting"; error?: undefined; response?: undefined }
  | { status: "success"; response: unknown; error?: undefined }
  | { status: "error"; error: string; response?: undefined };

export type DeclarativeAction = {
  id: string;
  pluginId?: string;
  intent: string;
  title: string;
  endpoint: AdminEndpointBinding;
  input?: { schema?: unknown; valuePath?: string };
  policy?: AdminEndpointPolicyHint;
  recordGuards?: readonly {
    field: string;
    operator: "equals" | "notEquals" | "in" | "notIn";
    value?: string | number | boolean | null;
    values?: readonly (string | number | boolean | null)[];
  }[];
};

export type DeclarativeActionContext = {
  record?: unknown;
};

export type DeclarativeField = {
  key: string;
  label: string;
  kind: "text" | "number" | "boolean" | "json";
  placeholder: string;
};
