import type { Token } from "./container";

export interface ProviderDefinition<T = unknown> {
  token: Token<T>;
  value: T;
  allowOverride?: boolean;
}

export const CORE_TOKENS = {
  config: Symbol("core:config"),
  logger: Symbol("core:logger"),
  db: Symbol("core:db"),
  events: Symbol("core:events"),
  auth: Symbol("core:auth"),
  settings: Symbol("core:settings"),
  settingsStore: Symbol("core:settings-store"),
  workspaceResolver: Symbol("core:workspace-resolver"),
  rbac: Symbol("core:rbac")
} as const;
