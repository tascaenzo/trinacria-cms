import type { DbAdapter, DbRepository } from "../contracts/db-adapter.js";
import type { PluginManifest } from "../contracts/plugin-manifest.js";
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

export type CollisionSeverity = "error" | "warning";

export interface CollisionRule {
  kind: string;
  severity: CollisionSeverity;
}

export interface NamespaceValidationResult {
  valid: boolean;
  errors: readonly string[];
  warnings: readonly string[];
}

export const DEFAULT_COLLISION_POLICY: readonly CollisionRule[] = [
  { kind: "plugin_id", severity: "error" },
  { kind: "entity", severity: "error" },
  { kind: "permission", severity: "error" },
  { kind: "event", severity: "error" },
  { kind: "admin_route", severity: "error" },
  { kind: "admin_resource_id", severity: "error" },
  { kind: "setting_key", severity: "error" },
  { kind: "alias", severity: "warning" },
  { kind: "navigation_label", severity: "warning" }
] as const;

/**
 * Canonical validator for plugin IDs, namespace segments, contribution keys,
 * and cross-plugin collision detection. Used by the runtime during plugin
 * registration to enforce namespace governance before load.
 */
export interface NamespaceValidator {
  validatePluginId(id: string): NamespaceValidationResult;
  validateManifest(manifest: PluginManifest): NamespaceValidationResult;
  registerPlugin(manifest: PluginManifest): NamespaceValidationResult;
  unregisterPlugin(pluginId: string): void;
  isReserved(id: string): boolean;
  getCollisionSnapshot(): ContributionIndex;
}

export interface ContributionIndex {
  plugins: string[];
  entities: Map<string, string>;
  permissions: Map<string, string>;
  routes: Map<string, string>;
  resourceIds: Map<string, string>;
  eventNames: Map<string, string>;
  settingCanonicalKeys: Map<string, string>;
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

function normalizeContributionKey(pluginId: string, localName: string): string {
  return `${pluginId.toLowerCase()}:${localName.toLowerCase()}`;
}

function normalizeSettingKey(pluginId: string, namespace: string, key: string): string {
  return `${pluginId.toLowerCase()}:${namespace.toLowerCase()}:${key.toLowerCase()}`;
}

/**
 * Creates a NamespaceValidator that enforces reserved names, plugin ID rules,
 * and contribution-level collision detection using the default collision policy.
 */
export function createNamespaceValidator(
  policy: readonly CollisionRule[] = DEFAULT_COLLISION_POLICY
): NamespaceValidator {
  const registeredPlugins = new Set<string>();
  const entities = new Map<string, string>();
  const permissions = new Map<string, string>();
  const routes = new Map<string, string>();
  const resourceIds = new Map<string, string>();
  const eventNames = new Map<string, string>();
  const settingCanonicalKeys = new Map<string, string>();

  const errorRules = new Set(
    policy.filter((rule) => rule.severity === "error").map((rule) => rule.kind)
  );

  function checkCollision(
    map: Map<string, string>,
    kind: string,
    key: string,
    pluginId: string
  ): string | null {
    const existing = map.get(key);
    if (existing && existing !== pluginId) {
      return errorRules.has(kind)
        ? `Collision error: ${kind} "${key}" already registered by plugin "${existing}"`
        : null;
    }
    return null;
  }

  function collectManifestContributions(manifest: PluginManifest): ContributionIndex {
    const pluginId = manifest.id;
    const next: ContributionIndex = {
      plugins: [pluginId],
      entities: new Map(),
      permissions: new Map(),
      routes: new Map(),
      resourceIds: new Map(),
      eventNames: new Map(),
      settingCanonicalKeys: new Map()
    };

    for (const entity of manifest.entities ?? []) {
      next.entities.set(entity.name.trim().toLowerCase(), pluginId);
    }
    for (const permission of manifest.security?.permissions ?? []) {
      next.permissions.set(permission.key.trim().toLowerCase(), pluginId);
    }
    for (const route of manifest.admin?.routes ?? []) {
      next.routes.set(route.path.trim().toLowerCase(), pluginId);
    }
    for (const resource of manifest.admin?.resources ?? []) {
      next.resourceIds.set(resource.id.trim().toLowerCase(), pluginId);
    }
    for (const event of manifest.events?.emits ?? []) {
      next.eventNames.set(normalizeContributionKey(pluginId, event.name), pluginId);
    }
    for (const setting of manifest.settings ?? []) {
      next.settingCanonicalKeys.set(
        normalizeSettingKey(pluginId, setting.namespace, setting.key),
        pluginId
      );
    }

    return next;
  }

  function validateAgainstSnapshot(
    manifest: PluginManifest,
    snapshot: ContributionIndex
  ): NamespaceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const pluginId = manifest.id;

    const pluginIdResult = validatePluginIdInternal(pluginId);
    errors.push(...pluginIdResult.errors);

    if (snapshot.plugins.includes(pluginId) && !registeredPlugins.has(pluginId)) {
      errors.push(`Collision error: plugin_id "${pluginId}" is already registered`);
    }

    const contributions = collectManifestContributions(manifest);
    for (const [key] of contributions.entities) {
      const err = checkCollision(snapshot.entities, "entity", key, pluginId);
      if (err) errors.push(err);
    }
    for (const [key] of contributions.permissions) {
      const err = checkCollision(snapshot.permissions, "permission", key, pluginId);
      if (err) errors.push(err);
    }
    for (const [key] of contributions.routes) {
      const err = checkCollision(snapshot.routes, "admin_route", key, pluginId);
      if (err) errors.push(err);
    }
    for (const [key] of contributions.resourceIds) {
      const err = checkCollision(snapshot.resourceIds, "admin_resource_id", key, pluginId);
      if (err) errors.push(err);
    }
    for (const [key] of contributions.eventNames) {
      const err = checkCollision(snapshot.eventNames, "event", key, pluginId);
      if (err) errors.push(err);
    }
    for (const [key] of contributions.settingCanonicalKeys) {
      const err = checkCollision(snapshot.settingCanonicalKeys, "setting_key", key, pluginId);
      if (err) errors.push(err);
    }

    const navigationLabels = new Map<string, string>();
    for (const nav of manifest.admin?.navigation ?? []) {
      const label = nav.label.trim().toLowerCase();
      const existing = navigationLabels.get(label);
      if (existing) {
        warnings.push(`Navigation label "${nav.label}" is duplicated within plugin "${pluginId}"`);
      }
      navigationLabels.set(label, pluginId);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  function validatePluginIdInternal(id: string): NamespaceValidationResult {
    const errors: string[] = [];
    if (!isValidPluginId(id)) {
      if (isReservedPluginId(id)) {
        errors.push(`Plugin ID "${id}" is reserved`);
      } else {
        errors.push(`Plugin ID "${id}" has invalid format`);
      }
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  }

  function buildSnapshotWithout(pluginId: string): ContributionIndex {
    const snapshot: ContributionIndex = {
      plugins: Array.from(registeredPlugins).filter((id) => id !== pluginId),
      entities: new Map(entities),
      permissions: new Map(permissions),
      routes: new Map(routes),
      resourceIds: new Map(resourceIds),
      eventNames: new Map(eventNames),
      settingCanonicalKeys: new Map(settingCanonicalKeys)
    };

    for (const [key, owner] of snapshot.entities)
      if (owner === pluginId) snapshot.entities.delete(key);
    for (const [key, owner] of snapshot.permissions)
      if (owner === pluginId) snapshot.permissions.delete(key);
    for (const [key, owner] of snapshot.routes) if (owner === pluginId) snapshot.routes.delete(key);
    for (const [key, owner] of snapshot.resourceIds)
      if (owner === pluginId) snapshot.resourceIds.delete(key);
    for (const [key, owner] of snapshot.eventNames)
      if (owner === pluginId) snapshot.eventNames.delete(key);
    for (const [key, owner] of snapshot.settingCanonicalKeys)
      if (owner === pluginId) snapshot.settingCanonicalKeys.delete(key);

    return snapshot;
  }

  function commitManifest(manifest: PluginManifest): void {
    const contributions = collectManifestContributions(manifest);
    unregisterPluginInternal(manifest.id);
    registeredPlugins.add(manifest.id);
    for (const [key, owner] of contributions.entities) entities.set(key, owner);
    for (const [key, owner] of contributions.permissions) permissions.set(key, owner);
    for (const [key, owner] of contributions.routes) routes.set(key, owner);
    for (const [key, owner] of contributions.resourceIds) resourceIds.set(key, owner);
    for (const [key, owner] of contributions.eventNames) eventNames.set(key, owner);
    for (const [key, owner] of contributions.settingCanonicalKeys)
      settingCanonicalKeys.set(key, owner);
  }

  function unregisterPluginInternal(pluginId: string): void {
    registeredPlugins.delete(pluginId);
    for (const [key, owner] of entities) {
      if (owner === pluginId) entities.delete(key);
    }
    for (const [key, owner] of permissions) {
      if (owner === pluginId) permissions.delete(key);
    }
    for (const [key, owner] of routes) {
      if (owner === pluginId) routes.delete(key);
    }
    for (const [key, owner] of resourceIds) {
      if (owner === pluginId) resourceIds.delete(key);
    }
    for (const [key, owner] of eventNames) {
      if (owner === pluginId) eventNames.delete(key);
    }
    for (const [key, owner] of settingCanonicalKeys) {
      if (owner === pluginId) settingCanonicalKeys.delete(key);
    }
  }

  return {
    validatePluginId(id: string) {
      return validatePluginIdInternal(id);
    },

    validateManifest(manifest: PluginManifest) {
      return validateAgainstSnapshot(manifest, buildSnapshotWithout(manifest.id));
    },

    registerPlugin(manifest: PluginManifest) {
      const result = validateAgainstSnapshot(manifest, buildSnapshotWithout(manifest.id));
      if (result.valid) {
        commitManifest(manifest);
      }
      return result;
    },

    unregisterPlugin(pluginId: string) {
      unregisterPluginInternal(pluginId);
    },

    isReserved(id: string) {
      return isReservedPluginId(id);
    },

    getCollisionSnapshot(): ContributionIndex {
      return {
        plugins: Array.from(registeredPlugins),
        entities: new Map(entities),
        permissions: new Map(permissions),
        routes: new Map(routes),
        resourceIds: new Map(resourceIds),
        eventNames: new Map(eventNames),
        settingCanonicalKeys: new Map(settingCanonicalKeys)
      };
    }
  };
}
