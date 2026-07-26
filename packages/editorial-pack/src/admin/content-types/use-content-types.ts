import { useCallback, useEffect, useState } from "react";
import type {
  CmsClient,
  ContentTypeField,
  ContentWorkflow,
  EditorialContentType
} from "../editorial-admin.types.js";
import { toEditorialDisplayError } from "../lib/editorial-admin-errors.js";

export interface CreateContentTypeDraft {
  name: string;
  key: string;
  description: string;
  icon: string;
  workflowId: "review" | "direct";
  ownershipScope: "inherit" | "own_entries" | "all_entries";
  fields: readonly ContentTypeField[];
  workflow: ContentWorkflow;
}

export function useContentTypes(cms: CmsClient) {
  const [contentTypes, setContentTypes] = useState<readonly EditorialContentType[]>([]);
  const [deletedContentTypes, setDeletedContentTypes] = useState<readonly EditorialContentType[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [activeResponse, deletedResponse] = await Promise.all([
        cms.request<{ data: readonly EditorialContentType[] }>({
          method: "GET",
          path: "/v1/editorial/content-types",
          query: { limit: 100, offset: 0 }
        }),
        cms.request<{ data: readonly EditorialContentType[] }>({
          method: "GET",
          path: "/v1/editorial/content-types/deleted",
          query: { limit: 100, offset: 0 }
        })
      ]);
      setContentTypes(activeResponse.data);
      setDeletedContentTypes(deletedResponse.data);
    } catch (currentError) {
      setContentTypes([]);
      setDeletedContentTypes([]);
      setError(toEditorialDisplayError(currentError, "Non è stato possibile caricare i modelli."));
    } finally {
      setIsLoading(false);
    }
  }, [cms]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mutate = async (request: { method: "DELETE" | "POST"; path: string }, message: string) => {
    try {
      setIsMutating(true);
      setError(null);
      await cms.request(request);
      await refresh();
      return true;
    } catch (currentError) {
      setError(toEditorialDisplayError(currentError, message));
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteContentType = (contentType: EditorialContentType) =>
    mutate(
      {
        method: "DELETE",
        path: `/v1/editorial/content-types/${contentType.id}`
      },
      "Non è stato possibile eliminare il modello."
    );

  const restoreContentType = (contentType: EditorialContentType) =>
    mutate(
      {
        method: "POST",
        path: `/v1/editorial/content-types/${contentType.id}/restore`
      },
      "Non è stato possibile ripristinare il modello."
    );

  const permanentlyDeleteContentType = (contentType: EditorialContentType) =>
    mutate(
      {
        method: "DELETE",
        path: `/v1/editorial/content-types/${contentType.id}/permanent`
      },
      "Non è stato possibile eliminare definitivamente il modello."
    );

  return {
    contentTypes,
    deletedContentTypes,
    error,
    isLoading,
    isMutating,
    deleteContentType,
    permanentlyDeleteContentType,
    restoreContentType
  };
}

export function useCreateContentType(cms: CmsClient) {
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const create = async (draft: CreateContentTypeDraft): Promise<EditorialContentType | null> => {
    try {
      setIsCreating(true);
      setError(null);
      const response = await cms.request<{ data: EditorialContentType }>({
        method: "POST",
        path: "/v1/editorial/content-types",
        body: toCreatePayload(draft)
      });
      return response.data;
    } catch (currentError) {
      setError(toEditorialDisplayError(currentError, "Non è stato possibile creare il modello."));
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { create, error, isCreating };
}

function toCreatePayload(draft: CreateContentTypeDraft) {
  return {
    name: draft.name.trim(),
    key: draft.key.trim(),
    ...(draft.icon ? { icon: draft.icon } : {}),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    workflowId: draft.workflowId,
    ownershipScope: draft.ownershipScope,
    fields: draft.fields,
    workflow: draft.workflow
  };
}
