/**
 * Minimal isolation context used by the kernel to separate
 * data and services across plugins (and optionally workspaces).
 */
export interface NamespaceContext {
  /** Unique identifier of the plugin that owns the resources. */
  pluginId: string;
  /** Workspace/tenant identifier when the plugin runs in multi-tenant mode. */
  workspaceId?: string;
}

/**
 * Builds a canonical namespace key to scope storage,
 * cache, metrics, and other infrastructure services.
 */
export function buildNamespaceKey(context: NamespaceContext): string {
  return context.workspaceId
    ? `plugin:${context.pluginId}:workspace:${context.workspaceId}`
    : `plugin:${context.pluginId}`;
}
