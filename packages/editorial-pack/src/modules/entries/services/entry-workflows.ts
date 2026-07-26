import type {
  ContentTypeRecord,
  ContentWorkflow
} from "../../content-types/content-types.schemas.js";

const REVIEW_WORKFLOW: ContentWorkflow = {
  preset: "review",
  states: [
    { key: "draft", label: "Bozza", initial: true },
    { key: "in_review", label: "In revisione", initial: false },
    { key: "approved", label: "Approvato", initial: false },
    { key: "published", label: "Pubblicato", initial: false }
  ],
  transitions: [
    {
      key: "submit",
      label: "Invia in revisione",
      from: "draft",
      to: "in_review",
      requiredPermission: "submit"
    },
    {
      key: "approve",
      label: "Approva",
      from: "in_review",
      to: "approved",
      requiredPermission: "approve"
    },
    {
      key: "request_changes",
      label: "Richiedi modifiche",
      from: "in_review",
      to: "draft",
      requiredPermission: "review"
    },
    {
      key: "publish",
      label: "Pubblica",
      from: "approved",
      to: "published",
      requiredPermission: "publish"
    },
    {
      key: "unpublish",
      label: "Rimuovi dalla pubblicazione",
      from: "published",
      to: "draft",
      requiredPermission: "publish"
    }
  ]
};

const DIRECT_WORKFLOW: ContentWorkflow = {
  preset: "direct",
  states: [
    { key: "draft", label: "Bozza", initial: true },
    { key: "published", label: "Pubblicato", initial: false }
  ],
  transitions: [
    {
      key: "publish",
      label: "Pubblica",
      from: "draft",
      to: "published",
      requiredPermission: "publish"
    },
    {
      key: "unpublish",
      label: "Rimuovi dalla pubblicazione",
      from: "published",
      to: "draft",
      requiredPermission: "publish"
    }
  ]
};

export function resolveEntryWorkflow(
  contentType: Pick<ContentTypeRecord, "workflowId" | "workflow">
): ContentWorkflow {
  if (contentType.workflow) return contentType.workflow;
  return contentType.workflowId === "direct" ? DIRECT_WORKFLOW : REVIEW_WORKFLOW;
}
