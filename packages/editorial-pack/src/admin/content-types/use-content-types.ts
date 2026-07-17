import { useCallback, useEffect, useState } from "react";
import type { CmsClient, EditorialContentType } from "../editorial-admin.types.js";
import { toEditorialDisplayError } from "../lib/editorial-admin-errors.js";

export interface CreateContentTypeDraft {
  name: string;
  key: string;
  description: string;
}

export function useContentTypes(cms: CmsClient) {
  const [contentTypes, setContentTypes] = useState<readonly EditorialContentType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await cms.request<{ data: readonly EditorialContentType[] }>({
        method: "GET",
        path: "/v1/editorial/content-types",
        query: { limit: 100, offset: 0 }
      });
      setContentTypes(response.data);
    } catch (currentError) {
      setContentTypes([]);
      setError(toEditorialDisplayError(currentError, "Non è stato possibile caricare i modelli."));
    } finally {
      setIsLoading(false);
    }
  }, [cms]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async (draft: CreateContentTypeDraft): Promise<boolean> => {
    try {
      setIsCreating(true);
      setError(null);
      await cms.request({
        method: "POST",
        path: "/v1/editorial/content-types",
        body: {
          name: draft.name.trim(),
          key: draft.key.trim(),
          ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
          fields: []
        }
      });
      await refresh();
      return true;
    } catch (currentError) {
      setError(toEditorialDisplayError(currentError, "Non è stato possibile creare il modello."));
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const toggleStatus = async (contentType: EditorialContentType) => {
    try {
      setError(null);
      await cms.request({
        method: "PATCH",
        path: `/v1/editorial/content-types/${contentType.id}`,
        body: { status: contentType.status === "active" ? "archived" : "active" }
      });
      await refresh();
    } catch (currentError) {
      setError(
        toEditorialDisplayError(currentError, "Non è stato possibile aggiornare il modello.")
      );
    }
  };

  return { contentTypes, error, isCreating, isLoading, create, refresh, toggleStatus };
}
