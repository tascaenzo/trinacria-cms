import { useCallback, useEffect, useRef, useState } from "react";
import { EMPTY_ENTRY_DRAFT, type EntryDraft } from "../editorial-entry-draft.js";

const HISTORY_LIMIT = 100;

export function useEditorDraft() {
  const [draft, setDraft] = useState<EntryDraft>(EMPTY_ENTRY_DRAFT);
  const [isDirty, setIsDirty] = useState(false);
  const [historyState, setHistoryState] = useState({ index: -1, length: 0 });
  const draftRef = useRef(draft);
  const historyRef = useRef<EntryDraft[]>([]);
  const historyIndexRef = useRef(-1);
  const savedFingerprintRef = useRef("");

  const syncDirtyState = useCallback((next: EntryDraft) => {
    setIsDirty(fingerprint(next) !== savedFingerprintRef.current);
  }, []);

  const reset = useCallback((next: EntryDraft) => {
    draftRef.current = next;
    setDraft(next);
    historyRef.current = [next];
    historyIndexRef.current = 0;
    setHistoryState({ index: 0, length: 1 });
    savedFingerprintRef.current = fingerprint(next);
    setIsDirty(false);
  }, []);

  /** Marks the current snapshot as persisted without discarding local undo/redo history. */
  const markSaved = useCallback((next: EntryDraft) => {
    draftRef.current = next;
    setDraft(next);
    if (historyIndexRef.current >= 0) {
      const history = [...historyRef.current];
      history[historyIndexRef.current] = next;
      historyRef.current = history;
    } else {
      historyRef.current = [next];
      historyIndexRef.current = 0;
    }
    setHistoryState({ index: historyIndexRef.current, length: historyRef.current.length });
    savedFingerprintRef.current = fingerprint(next);
    setIsDirty(false);
  }, []);

  const update = useCallback(
    (patch: Partial<EntryDraft>) => {
      const next = { ...draftRef.current, ...patch };
      draftRef.current = next;
      setDraft(next);
      const history = historyRef.current.slice(0, historyIndexRef.current + 1);
      history.push(next);
      historyRef.current = history.slice(-HISTORY_LIMIT);
      historyIndexRef.current = historyRef.current.length - 1;
      setHistoryState({ index: historyIndexRef.current, length: historyRef.current.length });
      syncDirtyState(next);
    },
    [syncDirtyState]
  );

  const restoreLocalDraft = useCallback((next: EntryDraft) => {
    draftRef.current = next;
    setDraft(next);
    historyRef.current = [next];
    historyIndexRef.current = 0;
    setHistoryState({ index: 0, length: 1 });
    setIsDirty(true);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    setHistoryState({ index: historyIndexRef.current, length: historyRef.current.length });
    const previous = historyRef.current[historyIndexRef.current];
    if (!previous) return;
    draftRef.current = previous;
    setDraft(previous);
    syncDirtyState(previous);
  }, [syncDirtyState]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    setHistoryState({ index: historyIndexRef.current, length: historyRef.current.length });
    const next = historyRef.current[historyIndexRef.current];
    if (!next) return;
    draftRef.current = next;
    setDraft(next);
    syncDirtyState(next);
  }, [syncDirtyState]);

  return {
    canRedo: historyState.index >= 0 && historyState.index < historyState.length - 1,
    canUndo: historyState.index > 0,
    draft,
    draftRef,
    historyIndexRef,
    historyRef,
    isDirty,
    markSaved,
    redo,
    reset,
    restoreLocalDraft,
    undo,
    update
  };
}

export function useDraftPersistence({
  draft,
  entryId,
  isDirty,
  onAutosave
}: {
  draft: EntryDraft;
  entryId?: string;
  isDirty: boolean;
  onAutosave: () => void;
}) {
  useEffect(() => {
    if (!entryId || !isDirty) return;
    writeDraftRecovery(entryId, draft);
    const timer = window.setTimeout(onAutosave, 4_000);
    return () => window.clearTimeout(timer);
  }, [draft, entryId, isDirty, onAutosave]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);
}

export function draftFingerprint(value: EntryDraft) {
  return JSON.stringify(value);
}

export function readDraftRecovery(entryId: string): { savedAt: number; draft: EntryDraft } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(recoveryKey(entryId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: unknown; draft?: unknown };
    if (!Number.isFinite(parsed.savedAt) || !parsed.draft || typeof parsed.draft !== "object")
      return null;
    return { savedAt: Number(parsed.savedAt), draft: parsed.draft as EntryDraft };
  } catch {
    return null;
  }
}

export function clearDraftRecovery(entryId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(recoveryKey(entryId));
  } catch {
    // No recovery value to remove.
  }
}

function writeDraftRecovery(entryId: string, draft: EntryDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      recoveryKey(entryId),
      JSON.stringify({ savedAt: Date.now(), draft })
    );
  } catch {
    // Browser privacy modes can deny local storage; server autosave remains active.
  }
}

function recoveryKey(entryId: string) {
  return `trinacria-cms:editorial-recovery:${entryId}`;
}

function fingerprint(value: EntryDraft) {
  return JSON.stringify(value);
}
