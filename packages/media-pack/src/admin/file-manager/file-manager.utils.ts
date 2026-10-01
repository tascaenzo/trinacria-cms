import { CmsSdkHttpError } from "@trinacria-cms/sdk";
import type { MediaAsset, MediaDirectory, ShareAction, Visibility } from "./file-manager.types.js";
import type { FileManagerSort } from "./file-manager-toolbar.js";
export function matchesAcceptedMimeType(mimeType: string, acceptedMimeTypes?: readonly string[]) {
  if (!acceptedMimeTypes?.length) return true;
  return acceptedMimeTypes.some((accepted) => {
    if (accepted.endsWith("/*")) return mimeType.startsWith(accepted.slice(0, -1));
    return mimeType === accepted;
  });
}

export function buildBreadcrumbs(
  directoryId: string | null,
  directories: readonly MediaDirectory[]
) {
  const result: MediaDirectory[] = [];
  let current = directories.find((directory) => directory.id === directoryId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    result.unshift(current);
    current = directories.find((directory) => directory.id === current?.parentId);
  }
  return result;
}
export function sortMediaItems(
  left: MediaDirectory | MediaAsset,
  right: MediaDirectory | MediaAsset,
  sort: FileManagerSort
) {
  const fallback = () =>
    mediaItemName(left).localeCompare(mediaItemName(right), "it", { sensitivity: "base" });
  if (sort === "updated")
    return (
      ("updatedAt" in right ? Date.parse(right.updatedAt) || 0 : 0) -
        ("updatedAt" in left ? Date.parse(left.updatedAt) || 0 : 0) || fallback()
    );
  if (sort === "size")
    return (
      ("byteSize" in right ? right.byteSize : 0) - ("byteSize" in left ? left.byteSize : 0) ||
      fallback()
    );
  return fallback();
}
function mediaItemName(item: MediaDirectory | MediaAsset) {
  return "displayName" in item ? item.displayName : item.name;
}
export function directoryPath(directory: MediaDirectory, directories: readonly MediaDirectory[]) {
  return buildBreadcrumbs(directory.id, directories)
    .map((entry) => entry.name)
    .join(" / ");
}
export function formatBytes(value: number) {
  if (value < 1_000_000) return `${Math.max(1, Math.round(value / 1_000))} KB`;
  return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} MB`;
}
export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(date);
}
export function visibilityLabel(value: Visibility) {
  return value === "public" ? "Pubblica" : value === "restricted" ? "Con restrizioni" : "Privata";
}
export function shareActionLabel(value: ShareAction) {
  return value === "read"
    ? "Leggere"
    : value === "write"
      ? "Modificare"
      : value === "manage"
        ? "Gestire"
        : "Condividere";
}
export interface StartedUpload {
  session: { id: string };
  upload: {
    method: "proxy" | "presigned";
    uploadUrl: string;
    requiredHeaders?: Readonly<Record<string, string>>;
  };
}

export function resolveUploadUrl(uploadUrl: string, apiBaseUrl: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(uploadUrl)) return uploadUrl;
  const normalizedBase = apiBaseUrl.replace(/\/$/, "");
  return `${normalizedBase}${uploadUrl.startsWith("/") ? uploadUrl : `/${uploadUrl}`}`;
}

export async function sha256(file: File): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error("Il browser non supporta il controllo di integrità dei file.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function toDisplayError(error: unknown) {
  const fallback = "Operazione media non riuscita.";
  if (error instanceof CmsSdkHttpError) {
    const response = error.data as { error?: { message?: string } } | undefined;
    return response?.error?.message?.trim() || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
