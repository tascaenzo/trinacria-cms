import type { createCmsSdkClient } from "@trinacria-cms/sdk";

export type CmsClient = ReturnType<typeof createCmsSdkClient>;

export interface ApiEnvelope<T> {
  data: T;
}

export type ContentFieldType =
  | "text"
  | "rich_text"
  | "number"
  | "boolean"
  | "date_time"
  | "select"
  | "url"
  | "media";

export interface ContentTypeField {
  key: string;
  label: string;
  type: ContentFieldType;
  required: boolean;
  multiple: boolean;
  config?: { options?: readonly string[] };
}

export interface ContentWorkflowState {
  key: string;
  label: string;
  initial: boolean;
}

export interface ContentWorkflowTransition {
  key: string;
  label: string;
  from: string;
  to: string;
}

export interface ContentWorkflow {
  preset: "review" | "direct" | "custom";
  states: readonly ContentWorkflowState[];
  transitions: readonly ContentWorkflowTransition[];
}

export interface EditorialContentType {
  id: string;
  key: string;
  name: string;
  description?: string;
  icon?: string;
  status: "active" | "archived";
  fields: readonly ContentTypeField[];
  taxonomyIds: readonly string[];
  workflowId?: string;
  workflow?: ContentWorkflow;
  showInMainNavigation?: boolean;
  updatedAt: string;
}

export type EditorialNavigator = (routeId: string, params?: URLSearchParams) => void;
