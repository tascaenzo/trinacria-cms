import type { SavedEditorialView } from "./entries.types.js";

const STORAGE_KEY = "trinacria.editorial.saved-views";

export function readSavedEditorialViews(): readonly SavedEditorialView[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isSavedEditorialView) : [];
  } catch {
    return [];
  }
}
export function writeSavedEditorialViews(views: readonly SavedEditorialView[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}
function isSavedEditorialView(value: unknown): value is SavedEditorialView {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedEditorialView>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.contentTypeId === "string" &&
    typeof candidate.search === "string" &&
    (candidate.mode === "list" || candidate.mode === "board")
  );
}
