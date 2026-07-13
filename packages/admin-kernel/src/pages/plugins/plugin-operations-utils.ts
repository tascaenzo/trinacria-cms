import type { PluginSnapshot } from "./plugin-operations.types.js";

export function reconcileSelectedPluginId(
  plugins: readonly PluginSnapshot[],
  currentPluginId: string | null
): string | null {
  if (currentPluginId && plugins.some((plugin) => plugin.id === currentPluginId)) {
    return currentPluginId;
  }

  return plugins[0]?.id ?? null;
}

export function pluginStateTone(
  state: PluginSnapshot["state"]
): "neutral" | "success" | "warning" | "danger" {
  if (state === "loaded") return "success";
  if (state === "failed") return "danger";
  if (state === "disabled") return "warning";
  return "neutral";
}

export function dependencyTone(
  status: PluginSnapshot["dependencies"][number]["status"]
): "neutral" | "success" | "warning" | "danger" {
  if (status === "ok") return "success";
  if (status === "missing") return "danger";
  return "warning";
}
