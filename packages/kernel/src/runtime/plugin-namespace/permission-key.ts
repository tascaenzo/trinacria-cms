export interface ParsedPermissionKey {
  pluginId: string;
  resource: string;
  action: string;
}

export interface ParsedPermissionPattern {
  pluginId: string;
  resourcePattern: string;
  actionPattern: string;
}

const PLUGIN_SEGMENT = "[a-z0-9][a-z0-9._/-]*";
const RESOURCE_SEGMENT = "[a-z0-9][a-z0-9._-]*";
const ACTION_SEGMENT = "[a-z0-9][a-z0-9._-]*";

const PERMISSION_KEY_REGEX = new RegExp(
  `^(?<pluginId>${PLUGIN_SEGMENT}):(?<resource>${RESOURCE_SEGMENT}):(?<action>${ACTION_SEGMENT})$`
);
const PERMISSION_PATTERN_REGEX = new RegExp(
  `^(?<pluginId>${PLUGIN_SEGMENT}):(?<resource>${RESOURCE_SEGMENT}|\\*):(?<action>${ACTION_SEGMENT}|\\*)$`
);

export function isValidPermissionKey(value: string): boolean {
  return Boolean(parsePermissionKey(value));
}

export function parsePermissionKey(value: string): ParsedPermissionKey | null {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(PERMISSION_KEY_REGEX);
  if (!match?.groups) return null;

  const pluginId = match.groups.pluginId;
  const resource = match.groups.resource;
  const action = match.groups.action;
  if (!pluginId || !resource || !action) return null;
  if (pluginId.includes("//")) return null;

  return {
    pluginId,
    resource,
    action
  };
}

export function isPermissionOwnedByPlugin(pluginId: string, permissionKey: string): boolean {
  const parsed = parsePermissionKey(permissionKey);
  if (!parsed) return false;
  return parsed.pluginId === pluginId.trim().toLowerCase();
}

export function isValidPermissionPattern(value: string): boolean {
  return Boolean(parsePermissionPattern(value));
}

export function parsePermissionPattern(value: string): ParsedPermissionPattern | null {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(PERMISSION_PATTERN_REGEX);
  if (!match?.groups) return null;

  const pluginId = match.groups.pluginId;
  const resourcePattern = match.groups.resource;
  const actionPattern = match.groups.action;
  if (!pluginId || !resourcePattern || !actionPattern) return null;
  if (pluginId.includes("//")) return null;

  return {
    pluginId,
    resourcePattern,
    actionPattern
  };
}

export function isPermissionPatternOwnedByPlugin(
  pluginId: string,
  permissionPattern: string
): boolean {
  const parsed = parsePermissionPattern(permissionPattern);
  if (!parsed) return false;
  return parsed.pluginId === pluginId.trim().toLowerCase();
}

export function matchesPermissionPattern(
  permissionPattern: string,
  permissionKey: string
): boolean {
  const pattern = parsePermissionPattern(permissionPattern);
  const key = parsePermissionKey(permissionKey);
  if (!pattern || !key) return false;
  if (pattern.pluginId !== key.pluginId) return false;

  const resourceMatches =
    pattern.resourcePattern === "*" || pattern.resourcePattern === key.resource;
  const actionMatches = pattern.actionPattern === "*" || pattern.actionPattern === key.action;
  return resourceMatches && actionMatches;
}
