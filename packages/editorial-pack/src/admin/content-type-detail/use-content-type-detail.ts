import { useCallback, useEffect, useState } from "react";
import type {
  CmsClient,
  ContentTypeField,
  ContentWorkflow,
  EditorialContentType
} from "../editorial-admin.types.js";
import { toEditorialDisplayError } from "../lib/editorial-admin-errors.js";

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
};

const DIRECT_WORKFLOW: ContentWorkflow = {
  preset: "direct",
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
};

export function workflowFromPreset(preset: "review" | "direct"): ContentWorkflow {
  const source = preset === "direct" ? DIRECT_WORKFLOW : REVIEW_WORKFLOW;
  return {
    ...source,
    states: source.states.map((state) => ({ ...state })),
    transitions: source.transitions.map((transition) => ({ ...transition }))
  };
}

export function useContentTypeDetail(cms: CmsClient, modelId: string | null) {
  const [model, setModel] = useState<EditorialContentType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workflow, setWorkflow] = useState<ContentWorkflow>(() => workflowFromPreset("review"));
  const [showInMainNavigation, setShowInMainNavigation] = useState(false);
  const [fields, setFields] = useState<readonly ContentTypeField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!modelId) {
      setModel(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await cms.request<{ data: EditorialContentType }>({
        method: "GET",
        path: `/v1/editorial/content-types/${modelId}`
      });
      setModel(response.data);
      setName(response.data.name);
      setDescription(response.data.description ?? "");
      setWorkflow(
        response.data.workflow ??
          workflowFromPreset(response.data.workflowId === "direct" ? "direct" : "review")
      );
      setShowInMainNavigation(Boolean(response.data.showInMainNavigation));
      setFields(response.data.fields);
    } catch (currentError) {
      setModel(null);
      setError(toEditorialDisplayError(currentError, "Non è stato possibile caricare il modello."));
    } finally {
      setIsLoading(false);
    }
  }, [cms, modelId]);
  useEffect(() => {
    void load();
  }, [load]);

  const addField = (field: ContentTypeField) => {
    if (fields.some((current) => current.key === field.key)) {
      setError(`La chiave "${field.key}" è già in uso in questo modello.`);
      return false;
    }
    setError(null);
    setFields((current) => [...current, field]);
    return true;
  };
  const removeField = (key: string) =>
    setFields((current) => current.filter((field) => field.key !== key));
  const save = async () => {
    if (!model) return false;
    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);
      const response = await cms.request<{ data: EditorialContentType }>({
        method: "PATCH",
        path: `/v1/editorial/content-types/${model.id}`,
        body: {
          name: name.trim(),
          ...(description.trim()
            ? { description: description.trim() }
            : { clearDescription: true }),
          workflow,
          showInMainNavigation,
          fields
        }
      });
      setModel(response.data);
      setMessage("Modello salvato.");
      window.dispatchEvent(new Event("trinacria-cms:editorial-navigation-updated"));
      return true;
    } catch (currentError) {
      setError(toEditorialDisplayError(currentError, "Non è stato possibile salvare il modello."));
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  return {
    model,
    name,
    description,
    workflow,
    showInMainNavigation,
    fields,
    error,
    message,
    isLoading,
    isSaving,
    setName,
    setDescription,
    setWorkflow,
    setShowInMainNavigation,
    addField,
    removeField,
    save
  };
}
