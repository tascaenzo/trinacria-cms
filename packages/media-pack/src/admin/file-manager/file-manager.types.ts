import type { createCmsSdkClient } from "@trinacria-cms/sdk";
export type CmsClient = ReturnType<typeof createCmsSdkClient>;
export type Visibility = "private" | "restricted" | "public";
export type PrincipalType = "user" | "role" | "plugin";
export type ShareAction = "read" | "write" | "manage" | "share";

export interface ApiEnvelope<T> {
  data: T;
}

export interface MediaDirectory {
  id: string;
  parentId?: string;
  name: string;
  visibility: Visibility;
  inheritAcl: boolean;
}

export interface MediaAsset {
  id: string;
  directoryId?: string;
  displayName: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  status: string;
  visibility: Visibility;
  updatedAt: string;
}

export interface MediaFileManagerSelection {
  asset: MediaAsset;
  url: string;
}

export interface MediaShare {
  id: string;
  principalType: PrincipalType;
  principalId: string;
  actions: readonly ShareAction[];
  expiresAt?: string;
}

export type DeleteTarget =
  | { kind: "asset"; value: MediaAsset }
  | { kind: "directory"; value: MediaDirectory };

export interface MediaFileManagerContext {
  cms: CmsClient;
  apiBaseUrl?: string;
  acceptedMimeTypes?: readonly string[];
  presentation?: "page" | "modal";
  selectionMode?: "manage" | "single";
  open?: boolean;
  onClose?: () => void;
  onSelect?: (selection: MediaFileManagerSelection) => void;
  selectLabel?: string;
  t?: (key: string, fallback?: string) => string;
}

export type FileManagerViewMode = "icons" | "list";
export type MediaVisibility = Visibility;
export type MediaPrincipalType = PrincipalType;
export type MediaShareAction = ShareAction;
