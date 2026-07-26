import { useCallback, useEffect, useState } from "react";
import {
  CONTENT_MODEL_ICON_OPTIONS,
  type CmsClient,
  type ContentTypeField,
  type ContentWorkflow,
  type EditorialContentType
} from "../editorial-admin.types.js";
import {
  hasDuplicateFieldKey,
  moveField,
  upsertField
} from "../content-types/content-field-collection.js";
import { toEditorialDisplayError } from "../lib/editorial-admin-errors.js";
import { workflowFromPreset } from "./content-workflow-presets.js";

type ModelIcon = (typeof CONTENT_MODEL_ICON_OPTIONS)[number]["value"];

interface ModelDraft {
  name: string;
  description: string;
  icon: ModelIcon;
  workflow: ContentWorkflow;
  fields: readonly ContentTypeField[];
}

const EMPTY_DRAFT: ModelDraft = {
  name: "",
  description: "",
  icon: "file-text",
  workflow: workflowFromPreset("review"),
  fields: []
};

export function useContentTypeDetail(cms: CmsClient, modelId: string | null) {
  const [model, setModel] = useState<EditorialContentType | null>(null);
  const [draft, setDraft] = useState<ModelDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const updateDraft = (next: Partial<ModelDraft>) =>
    setDraft((current) => ({ ...current, ...next }));

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
      setDraft(toModelDraft(response.data));
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

  const rejectDuplicateField = (key: string) => {
    setError(`La chiave "${key}" è già in uso in questo modello.`);
    return false;
  };

  const addField = (field: ContentTypeField) => {
    if (hasDuplicateFieldKey(draft.fields, field.key)) return rejectDuplicateField(field.key);
    setError(null);
    updateDraft({ fields: upsertField(draft.fields, field) });
    return true;
  };

  const updateField = (key: string, field: ContentTypeField) => {
    if (hasDuplicateFieldKey(draft.fields, field.key, key)) return rejectDuplicateField(field.key);
    setError(null);
    updateDraft({ fields: upsertField(draft.fields, field, key) });
    return true;
  };

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
          name: draft.name.trim(),
          ...(draft.description.trim()
            ? { description: draft.description.trim() }
            : { clearDescription: true }),
          icon: draft.icon,
          workflow: draft.workflow,
          fields: draft.fields
        }
      });
      setModel(response.data);
      setDraft(toModelDraft(response.data));
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
    ...draft,
    error,
    message,
    isLoading,
    isSaving,
    setName: (name: string) => updateDraft({ name }),
    setDescription: (description: string) => updateDraft({ description }),
    setIcon: (icon: ModelIcon) => updateDraft({ icon }),
    setWorkflow: (workflow: ContentWorkflow) => updateDraft({ workflow }),
    addField,
    updateField,
    removeField: (key: string) =>
      updateDraft({ fields: draft.fields.filter((field) => field.key !== key) }),
    moveField: (key: string, direction: "up" | "down") =>
      updateDraft({ fields: moveField(draft.fields, key, direction) }),
    save
  };
}

function toModelDraft(model: EditorialContentType): ModelDraft {
  return {
    name: model.name,
    description: model.description ?? "",
    icon: isModelIcon(model.icon) ? model.icon : "file-text",
    workflow:
      model.workflow ?? workflowFromPreset(model.workflowId === "direct" ? "direct" : "review"),
    fields: model.fields
  };
}

function isModelIcon(icon?: string): icon is ModelIcon {
  return CONTENT_MODEL_ICON_OPTIONS.some((option) => option.value === icon);
}
