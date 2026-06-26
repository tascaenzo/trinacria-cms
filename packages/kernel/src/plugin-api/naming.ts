const SEGMENT_SEPARATOR = ":";

export interface DefineQualifiedKeyInput {
  pluginId: string;
  segments: readonly string[];
}

export function defineQualifiedKey(input: DefineQualifiedKeyInput): string {
  const pluginId = normalizePluginId(input.pluginId);
  const segments = input.segments.map((segment) => normalizeKeySegment(segment));
  return [pluginId, ...segments].join(SEGMENT_SEPARATOR);
}

export function normalizePluginId(pluginId: string): string {
  return normalizeKeySegment(pluginId);
}

export function normalizeKeySegment(segment: string): string {
  const normalized = segment
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  if (!normalized) {
    throw new Error("Plugin key segments cannot be empty.");
  }
  return normalized;
}

export function normalizeCapability(capability: string): string {
  return capability.trim().toLowerCase();
}

export function omitEmptyArray<T>(items: readonly T[] | undefined): readonly T[] | undefined {
  if (!items || items.length === 0) {
    return undefined;
  }
  return [...items];
}
