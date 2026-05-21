import type { DbAdapter, DbRepository } from "../contracts/db-adapter.js";
import { DbAdapterError } from "../errors/db-errors.js";

export interface PluginDbScope {
  repository<TData = unknown>(entityName: string): DbRepository<TData>;
}

const NAMESPACE_ID_SEPARATOR = ":";
const PLUGIN_ID_REGEX = /^[a-z0-9][a-z0-9-._/]*$/;
const NAMESPACE_SEGMENT_REGEX = /^[a-z0-9][a-z0-9._-]*$/;

export const RESERVED_PLUGIN_IDS = ["core", "kernel", "system", "admin", "trinacria"] as const;

export const RESERVED_NAMESPACE_SEGMENTS = [...RESERVED_PLUGIN_IDS, "core-pack"] as const;

export interface ContributionCollision {
  kind: string;
  key: string;
}

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

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

export function isReservedPluginId(value: string): boolean {
  const normalized = normalizeIdentifier(value);
  return RESERVED_PLUGIN_IDS.includes(normalized as (typeof RESERVED_PLUGIN_IDS)[number]);
}

export function isReservedNamespaceSegment(value: string): boolean {
  const normalized = normalizeIdentifier(value);
  return RESERVED_NAMESPACE_SEGMENTS.includes(
    normalized as (typeof RESERVED_NAMESPACE_SEGMENTS)[number]
  );
}

export function isValidPluginId(value: string): boolean {
  const normalized = normalizeIdentifier(value);
  return (
    PLUGIN_ID_REGEX.test(normalized) &&
    !normalized.includes("//") &&
    !isReservedPluginId(normalized)
  );
}

export function isValidNamespaceSegment(value: string): boolean {
  const normalized = normalizeIdentifier(value);
  return NAMESPACE_SEGMENT_REGEX.test(normalized) && !isReservedNamespaceSegment(normalized);
}

export function buildContributionKey(pluginId: string, localName: string): string {
  const p = assertSegment(pluginId, "pluginId").toLowerCase();
  const local = assertSegment(localName, "localName").toLowerCase();
  return `${p}:${local}`;
}

export function buildSettingKey(pluginId: string, namespace: string, key: string): string {
  const p = assertSegment(pluginId, "pluginId").toLowerCase();
  const n = assertSegment(namespace, "namespace").toLowerCase();
  const k = assertSegment(key, "key").toLowerCase();
  return `${p}:${n}:${k}`;
}

export function findContributionCollisions(
  kind: string,
  keys: readonly string[]
): ContributionCollision[] {
  const seen = new Set<string>();
  const collisions: ContributionCollision[] = [];

  for (const key of keys) {
    const normalized = key.trim().toLowerCase();
    if (seen.has(normalized)) {
      collisions.push({ kind, key: normalized });
      continue;
    }
    seen.add(normalized);
  }

  return collisions;
}

export function assertNoContributionCollisions(kind: string, keys: readonly string[]): void {
  const [collision] = findContributionCollisions(kind, keys);
  if (!collision) {
    return;
  }

  throw new DbAdapterError(`Duplicate ${kind} contribution "${collision.key}"`, {
    kind: collision.kind,
    key: collision.key
  });
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
