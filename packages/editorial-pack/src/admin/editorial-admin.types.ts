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
  | "media"
  | "relation"
  | "json"
  | "repeatable";

export const CONTENT_MODEL_ICON_OPTIONS = [
  { value: "file-text", label: "Documento" },
  { value: "file", label: "Pagina" },
  { value: "calendar-days", label: "Evento" },
  { value: "image", label: "Galleria" },
  { value: "globe", label: "Sito" },
  { value: "package", label: "Scheda" },
  { value: "sparkles", label: "In evidenza" }
] as const;

export interface ContentTypeField {
  key: string;
  label: string;
  type: ContentFieldType;
  required: boolean;
  multiple: boolean;
  helpText?: string;
  config?: { options?: readonly string[]; [key: string]: unknown };
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
  requiredPermission?: "submit" | "review" | "approve" | "publish";
}

export interface ContentWorkflow {
  preset: "review" | "direct" | "custom";
  name?: string;
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
  updatedAt: string;
  deletedAt?: string;
}

export interface EditorialEntryRecord {
  id: string;
  contentTypeId: string;
  ownerUserId: string;
  reviewerUserId?: string;
  title?: string;
  slug?: string;
  body?: Record<string, unknown>;
  data: Record<string, unknown>;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

export type EditorialNavigator = (routeId: string, params?: URLSearchParams) => void;
