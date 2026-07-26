import type { ContentWorkflow } from "../editorial-admin.types.js";

const WORKFLOW_PRESETS: Record<"review" | "direct", ContentWorkflow> = {
  review: {
    preset: "review",
    name: "Revisione editoriale",
    states: [
      { key: "draft", label: "Bozza", initial: true },
      { key: "in_review", label: "In revisione", initial: false },
      { key: "approved", label: "Approvato", initial: false },
      { key: "published", label: "Pubblicato", initial: false }
    ],
    transitions: [
      { key: "submit", label: "Invia in revisione", from: "draft", to: "in_review" },
      { key: "approve", label: "Approva", from: "in_review", to: "approved" },
      {
        key: "request_changes",
        label: "Richiedi modifiche",
        from: "in_review",
        to: "draft"
      },
      { key: "publish", label: "Pubblica", from: "approved", to: "published" },
      {
        key: "unpublish",
        label: "Rimuovi dalla pubblicazione",
        from: "published",
        to: "draft"
      }
    ]
  },
  direct: {
    preset: "direct",
    name: "Pubblicazione diretta",
    states: [
      { key: "draft", label: "Bozza", initial: true },
      { key: "published", label: "Pubblicato", initial: false }
    ],
    transitions: [
      { key: "publish", label: "Pubblica", from: "draft", to: "published" },
      {
        key: "unpublish",
        label: "Rimuovi dalla pubblicazione",
        from: "published",
        to: "draft"
      }
    ]
  }
};

export function workflowFromPreset(preset: "review" | "direct"): ContentWorkflow {
  const source = WORKFLOW_PRESETS[preset];
  return {
    ...source,
    states: source.states.map((state) => ({ ...state })),
    transitions: source.transitions.map((transition) => ({ ...transition }))
  };
}
