import { useCallback, useState } from "react";
import type { CmsClient, EditorialEntryRecord } from "../editorial-admin.types.js";
import type { EditorRevision } from "../editorial-revisions-dialog.js";

export function useEditorRevisions({
  cms,
  entryId,
  onError
}: {
  cms: CmsClient;
  entryId?: string;
  onError: (error: unknown, fallback: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [revisions, setRevisions] = useState<readonly EditorRevision[]>([]);

  const load = useCallback(async () => {
    if (!entryId) return;
    try {
      setIsLoading(true);
      const response = await cms.request<{ data: readonly EditorRevision[] }>({
        method: "GET",
        path: `/v1/editorial/entries/${entryId}/revisions`
      });
      setRevisions(response.data);
      setIsOpen(true);
    } catch (error) {
      onError(error, "Non è stato possibile caricare la cronologia.");
    } finally {
      setIsLoading(false);
    }
  }, [cms, entryId, onError]);

  const restore = useCallback(
    async (revision: EditorRevision): Promise<EditorialEntryRecord | null> => {
      if (!entryId) return null;
      try {
        setIsRestoring(true);
        const response = await cms.request<{ data: EditorialEntryRecord }>({
          method: "POST",
          path: `/v1/editorial/entries/${entryId}/revisions/${revision.id}/restore`
        });
        return response.data;
      } catch (error) {
        onError(error, "Non è stato possibile ripristinare la revisione.");
        return null;
      } finally {
        setIsRestoring(false);
      }
    },
    [cms, entryId, onError]
  );

  const createSnapshot = useCallback(async () => {
    if (!entryId) return false;
    try {
      setIsCreating(true);
      await cms.request({ method: "POST", path: `/v1/editorial/entries/${entryId}/revisions` });
      await load();
      return true;
    } catch (error) {
      onError(error, "Non è stato possibile creare la versione.");
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [cms, entryId, load, onError]);

  return {
    createSnapshot,
    isCreating,
    isLoading,
    isOpen,
    isRestoring,
    load,
    restore,
    revisions,
    setIsOpen
  };
}
