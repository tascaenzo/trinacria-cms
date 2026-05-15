import type { DbAdapter, DbRepository } from "../contracts/db-adapter.js";
import { DbAdapterError } from "../errors/db-errors.js";

export interface PluginDbScope {
  repository<TData = unknown>(entityName: string): DbRepository<TData>;
}

const NAMESPACE_ID_SEPARATOR = ":";

function assertSegment(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DbAdapterError(`${field} is required`);
  }
  if (normalized.includes(NAMESPACE_ID_SEPARATOR)) {
    throw new DbAdapterError(`${field} cannot contain "${NAMESPACE_ID_SEPARATOR}"`, {
      field,
      value: normalized
    });
  }
  return normalized;
}

/**
 * Builds a canonical namespace ID.
 * Format: `${pluginId}:${entityName}:${resourceId}`
 */
export function buildNamespaceId(pluginId: string, entityName: string, resourceId: string): string {
  const p = assertSegment(pluginId, "pluginId");
  const e = assertSegment(entityName, "entityName");
  const r = assertSegment(resourceId, "resourceId");
  return `${p}:${e}:${r}`;
}

export interface ParsedNamespaceId {
  pluginId: string;
  entityName: string;
  resourceId: string;
}

/**
 * Parses a namespace ID and validates format.
 */
export function parseNamespaceId(namespaceId: string): ParsedNamespaceId {
  const normalized = namespaceId.trim();
  const segments = normalized.split(NAMESPACE_ID_SEPARATOR);
  if (segments.length !== 3) {
    throw new DbAdapterError(
      `Invalid namespaceId "${namespaceId}". Expected format "pluginId:entityName:resourceId"`
    );
  }

  const [pluginId, entityName, resourceId] = segments;
  if (!pluginId || !entityName || !resourceId) {
    throw new DbAdapterError(`Invalid namespaceId "${namespaceId}". Empty segment is not allowed`);
  }

  return { pluginId, entityName, resourceId };
}

/**
 * Ensures a namespace ID belongs to the expected plugin.
 */
export function assertPluginOwnsNamespaceId(pluginId: string, namespaceId: string): void {
  const parsed = parseNamespaceId(namespaceId);
  if (parsed.pluginId !== pluginId) {
    throw new DbAdapterError(
      `Namespace ownership violation: "${namespaceId}" does not belong to plugin "${pluginId}"`,
      {
        expectedPluginId: pluginId,
        actualPluginId: parsed.pluginId
      }
    );
  }
}

/**
 * Creates a plugin-scoped DB facade that always injects the same pluginId.
 */
export function createPluginDbScope(db: DbAdapter, pluginId: string): PluginDbScope {
  const normalizedPluginId = assertSegment(pluginId, "pluginId");

  return {
    repository<TData = unknown>(entityName: string): DbRepository<TData> {
      return db.repository<TData>(entityName, {
        pluginId: normalizedPluginId
      });
    }
  };
}
