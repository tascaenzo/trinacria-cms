import type { PluginManifest } from "../../contracts/plugin-manifest.js";
import type { ContributionIndex, CollisionRule, NamespaceValidationResult, NamespaceValidator } from "./plugin-namespace.js";
import { isReservedPluginId, isValidPluginId, DEFAULT_COLLISION_POLICY, isReservedNamespaceSegment, buildContributionKey } from "./plugin-namespace.js";

function normalizeContributionKey(pluginId: string, localName: string): string {
  return `${pluginId.toLowerCase()}:${localName.toLowerCase()}`;
}

function normalizeSettingKey(key: string): string {
  return key.trim().toLowerCase();
}

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
      next.settingCanonicalKeys.set(normalizeSettingKey(setting.key), pluginId);
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
