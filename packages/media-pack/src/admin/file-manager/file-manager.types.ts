export type MediaVisibility = "private" | "restricted" | "public";
export type MediaPrincipalType = "user" | "role" | "plugin";
export type MediaShareAction = "read" | "write" | "manage" | "share";
export type FileManagerViewMode = "icons" | "list";

export interface MediaDirectory {
  id: string;
  parentId?: string;
  name: string;
  visibility: MediaVisibility;
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
  visibility: MediaVisibility;
  updatedAt: string;
}

export interface MediaShare {
  id: string;
  principalType: MediaPrincipalType;
  principalId: string;
  actions: readonly MediaShareAction[];
  expiresAt?: string;
}
