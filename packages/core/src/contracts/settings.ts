import type { WorkspaceContext } from "./workspace";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type SettingsScope = "global" | "workspace" | "plugin" | "user";

export interface SettingsKey {
  namespace: string;
  key: string;
}

export interface SettingsQuery extends SettingsKey, Partial<WorkspaceContext> {
  scope?: SettingsScope;
}

export interface SettingsRecord extends SettingsKey {
  scope: SettingsScope;
  workspaceId?: string;
  pluginId?: string;
  userId?: string;
  value: JsonValue;
  version: number;
  updatedAt: string;
  updatedBy?: string;
}

export interface SettingsStore {
  get(query: SettingsQuery): Promise<SettingsRecord | null>;
  set(
    query: SettingsQuery,
    value: JsonValue,
    options?: { expectedVersion?: number; updatedBy?: string }
  ): Promise<SettingsRecord>;
  delete(query: SettingsQuery): Promise<void>;
  list(
    query: Pick<SettingsQuery, "namespace"> & Partial<WorkspaceContext>
  ): Promise<SettingsRecord[]>;
}

export interface SettingsService {
  get(query: SettingsQuery): Promise<JsonValue | null>;
  set(
    query: SettingsQuery,
    value: JsonValue,
    options?: { expectedVersion?: number; updatedBy?: string }
  ): Promise<SettingsRecord>;
  delete(query: SettingsQuery): Promise<void>;
}
