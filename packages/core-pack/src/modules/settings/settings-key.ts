/**
 * Canonical settings key parser result.
 * Format: `<pluginId>:<domain>:<name>`.
 */
export interface ParsedSettingKey {
  pluginId: string;
  domain: string;
  name: string;
}

const PLUGIN_SEGMENT = "[a-z0-9][a-z0-9._/-]*";
const DOMAIN_SEGMENT = "[a-z0-9][a-z0-9._-]*";
const NAME_SEGMENT = "[a-z0-9][a-z0-9._-]*";

const SETTING_KEY_REGEX = new RegExp(
  `^(?<pluginId>${PLUGIN_SEGMENT}):(?<domain>${DOMAIN_SEGMENT}):(?<name>${NAME_SEGMENT})$`,
);

/**
 * Parses and normalizes a settings key.
 */
export function parseSettingKey(value: string): ParsedSettingKey | null {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(SETTING_KEY_REGEX);
  if (!match?.groups) return null;

  const pluginId = match.groups.pluginId;
  const domain = match.groups.domain;
  const name = match.groups.name;
  if (!pluginId || !domain || !name) return null;
  if (pluginId.includes("//")) return null;

  return {
    pluginId,
    domain,
    name,
  };
}

/**
 * Returns true when the setting key has canonical format.
 */
export function isValidSettingKey(value: string): boolean {
  return Boolean(parseSettingKey(value));
}

/**
 * Extracts owner plugin id from canonical setting key.
 */
export function getOwnerPluginIdFromSettingKey(value: string): string {
  const parsed = parseSettingKey(value);
  if (!parsed) {
    throw new Error(
      `Invalid setting key "${value}". Expected '<pluginId>:<domain>:<name>'`,
    );
  }
  return parsed.pluginId;
}

/**
 * Verifies that requester plugin matches key owner namespace.
 */
export function assertRequesterOwnsSettingKey(
  requesterPluginId: string,
  settingKey: string,
  action = "modify",
): void {
  const ownerPluginId = getOwnerPluginIdFromSettingKey(settingKey);
  const normalizedRequester = requesterPluginId.trim().toLowerCase();
  if (ownerPluginId !== normalizedRequester) {
    throw createSettingsOwnerAccessError({
      action,
      key: settingKey,
      requesterPluginId: normalizedRequester,
      ownerPluginId,
    });
  }
}
import { createSettingsOwnerAccessError } from "./settings.errors.js";
