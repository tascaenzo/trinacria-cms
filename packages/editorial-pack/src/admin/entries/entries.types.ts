import type { ContentWorkflow, EditorialContentType } from "../editorial-admin.types.js";

export type EntryStatus = string;

export interface EditorialEntry {
  id: string;
  contentTypeId: string;
  title?: string;
  slug?: string;
  status: EntryStatus;
  updatedAt: string;
}

export interface EntryRevision {
  id: string;
  revisionNumber: number;
  reason: string;
  createdAt: string;
}

export interface TransitionAction {
  id: string;
  label: string;
}

const DEFAULT_STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Bozza", className: "bg-slate-500/10 text-slate-600" },
  in_review: { label: "In revisione", className: "bg-amber-500/10 text-amber-700" },
  approved: { label: "Approvato", className: "bg-sky-500/10 text-sky-700" },
  published: { label: "Pubblicato", className: "bg-emerald-500/10 text-emerald-700" },
  archived: { label: "Archiviato", className: "bg-slate-500/10 text-slate-600" }
};

const REVIEW_WORKFLOW: ContentWorkflow = {
  preset: "review",
  states: [
    { key: "draft", label: "Bozza", initial: true },
    { key: "in_review", label: "In revisione", initial: false },
    { key: "approved", label: "Approvato", initial: false },
    { key: "published", label: "Pubblicato", initial: false }
  ],
  transitions: [
    { key: "submit", label: "Invia in revisione", from: "draft", to: "in_review" },
    { key: "approve", label: "Approva", from: "in_review", to: "approved" },
    { key: "request_changes", label: "Richiedi modifiche", from: "in_review", to: "draft" },
    { key: "publish", label: "Pubblica", from: "approved", to: "published" },
    { key: "unpublish", label: "Rimuovi dalla pubblicazione", from: "published", to: "draft" }
  ]
};

const DIRECT_WORKFLOW: ContentWorkflow = {
  preset: "direct",
  states: [
    { key: "draft", label: "Bozza", initial: true },
    { key: "published", label: "Pubblicato", initial: false }
  ],
  transitions: [
    { key: "publish", label: "Pubblica", from: "draft", to: "published" },
    { key: "unpublish", label: "Rimuovi dalla pubblicazione", from: "published", to: "draft" }
  ]
};

export function getWorkflow(contentType?: EditorialEntryContentType): ContentWorkflow {
  if (contentType?.workflow) return contentType.workflow;
  return contentType?.workflowId === "direct" ? DIRECT_WORKFLOW : REVIEW_WORKFLOW;
}

export function getEntryStatusMeta(status: EntryStatus, contentType?: EditorialEntryContentType) {
  const state = getWorkflow(contentType).states.find((item) => item.key === status);
  return (
    DEFAULT_STATUS_META[status] ?? {
      label: state?.label ?? status,
      className: "bg-slate-500/10 text-slate-600"
    }
  );
}

export function getEntryActions(
  status: EntryStatus,
  contentType?: EditorialEntryContentType
): readonly TransitionAction[] {
  return getWorkflow(contentType)
    .transitions.filter((transition) => transition.from === status)
    .map((transition) => ({ id: transition.key, label: transition.label }));
}

export function getTransitionToStatus(
  entry: EditorialEntry,
  targetStatus: string,
  contentType?: EditorialEntryContentType
): TransitionAction | null {
  const transition = getWorkflow(contentType).transitions.find(
    (candidate) => candidate.from === entry.status && candidate.to === targetStatus
  );
  return transition ? { id: transition.key, label: transition.label } : null;
}

export function supportsEditorialReview(contentType: EditorialEntryContentType): boolean {
  const workflow = getWorkflow(contentType);
  if (workflow.preset === "review") return true;
  return (
    workflow.states.some((state) => state.key === "in_review" || state.key === "approved") ||
    workflow.transitions.some(
      (transition) =>
        transition.requiredPermission === "review" || transition.requiredPermission === "approve"
    )
  );
}

export function getWorkflowStates(
  contentTypes: readonly EditorialEntryContentType[]
): ContentWorkflow["states"] {
  const states = new Map<string, ContentWorkflow["states"][number]>();
  for (const contentType of contentTypes) {
    for (const state of getWorkflow(contentType).states) {
      if (!states.has(state.key)) states.set(state.key, state);
    }
  }
  return Array.from(states.values());
}

export function formatEditorialDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "data non disponibile"
    : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(
        date
      );
}

export type EditorialEntryContentType = Pick<
  EditorialContentType,
  "id" | "key" | "name" | "status" | "workflowId" | "workflow"
>;
