import { useToast } from "@trinacria-cms/trinacria-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CmsClient } from "../editorial-admin.types.js";
import { toEditorialDisplayError } from "../lib/editorial-admin-errors.js";
import type {
  EditorialEntry,
  EditorialEntryContentType,
  EntryRevision,
  TransitionAction
} from "./entries.types.js";

export function useEditorialEntries(cms: CmsClient) {
  const { pushToast } = useToast();
  const [entries, setEntries] = useState<readonly EditorialEntry[]>([]);
  const [contentTypes, setContentTypes] = useState<readonly EditorialEntryContentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionEntryId, setActionEntryId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [entriesResponse, contentTypesResponse] = await Promise.all([
        cms.request<{ data: readonly EditorialEntry[] }>({
          method: "GET",
          path: "/v1/editorial/entries",
          query: { limit: 100, offset: 0 }
        }),
        cms.request<{ data: readonly EditorialEntryContentType[] }>({
          method: "GET",
          path: "/v1/editorial/content-types",
          query: { limit: 100, offset: 0 }
        })
      ]);
      setEntries(entriesResponse.data);
      setContentTypes(contentTypesResponse.data);
    } catch (currentError) {
      setError(
        toEditorialDisplayError(currentError, "Non è stato possibile caricare i contenuti.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [cms]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeContentTypes = useMemo(
    () => contentTypes.filter((contentType) => contentType.status === "active"),
    [contentTypes]
  );
  const contentTypeById = useMemo(
    () => new Map(contentTypes.map((contentType) => [contentType.id, contentType])),
    [contentTypes]
  );
  const create = async (contentTypeId: string, title: string) => {
    try {
      setIsCreating(true);
      setError(null);
      const response = await cms.request<{ data: EditorialEntry }>({
        method: "POST",
        path: "/v1/editorial/entries",
        body: { contentTypeId, ...(title.trim() ? { title: title.trim() } : {}), data: {} }
      });
      await refresh();
      pushToast({
        tone: "success",
        title: "Contenuti editoriali",
        description: "Bozza creata.",
        duration: 4000
      });
      return response.data;
    } catch (currentError) {
      const message = toEditorialDisplayError(
        currentError,
        "Non è stato possibile creare la bozza."
      );
      setError(message);
      pushToast({
        tone: "danger",
        title: "Operazione non riuscita",
        description: message,
        duration: 0
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };
  const transition = async (entry: EditorialEntry, action: TransitionAction) => {
    try {
      setActionEntryId(entry.id);
      setError(null);
      await cms.request({
        method: "POST",
        path: `/v1/editorial/entries/${entry.id}/transition`,
        body: { transitionId: action.id }
      });
      await refresh();
      pushToast({
        tone: "success",
        title: "Workflow editoriale",
        description: "Stato aggiornato.",
        duration: 4000
      });
    } catch (currentError) {
      const message = toEditorialDisplayError(
        currentError,
        "Non è stato possibile aggiornare il workflow."
      );
      setError(message);
      pushToast({
        tone: "danger",
        title: "Operazione non riuscita",
        description: message,
        duration: 0
      });
    } finally {
      setActionEntryId(null);
    }
  };
  const loadRevisions = async (entry: EditorialEntry): Promise<readonly EntryRevision[]> => {
    try {
      setError(null);
      const response = await cms.request<{ data: readonly EntryRevision[] }>({
        method: "GET",
        path: `/v1/editorial/entries/${entry.id}/revisions`
      });
      return response.data;
    } catch (currentError) {
      setError(
        toEditorialDisplayError(currentError, "Non è stato possibile caricare la cronologia.")
      );
      return [];
    }
  };
  return {
    entries,
    contentTypes,
    activeContentTypes,
    contentTypeById,
    isLoading,
    isCreating,
    error,
    actionEntryId,
    create,
    transition,
    loadRevisions,
    refresh
  };
}
