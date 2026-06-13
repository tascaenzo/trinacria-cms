export type AdminContributionMode = "declarative" | "react";

export interface AdminEndpointBinding {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
}

export interface AdminJsonDataBinding {
  endpoint?: AdminEndpointBinding;
  valuePath?: string;
  schema?: unknown;
}
