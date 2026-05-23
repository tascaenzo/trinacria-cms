import type { PluginRuntimeRecord, PluginState } from "../contracts/plugin-runtime.js";
import { PluginStateTransitionError } from "../errors/plugin-errors.js";

export const ALLOWED_PLUGIN_STATE_TRANSITIONS: Readonly<
  Record<PluginState, readonly PluginState[]>
> = {
  registered: ["loading", "disabled"],
  loading: ["initializing", "failed"],
  initializing: ["loaded", "failed"],
  loaded: ["unloading", "disabled", "failed"],
  unloading: ["unloaded", "failed", "disabled"],
  failed: ["loading", "disabled", "unloaded"],
  disabled: ["registered"],
  unloaded: ["loading", "disabled", "registered"]
};

export function createPluginStatusReason(
  state: PluginState,
  details?: Record<string, unknown>
): PluginRuntimeRecord["statusReason"] {
  const messages: Record<PluginState, string> = {
    registered: "Plugin is registered and ready for manual load",
    loading: "Plugin is registering runtime modules",
    initializing: "Plugin load completed and lifecycle init is running",
    loaded: "Plugin is loaded and operational",
    unloading: "Plugin unload is releasing lifecycle hooks and modules",
    failed: "Plugin entered failed state during lifecycle execution",
    disabled: "Plugin is disabled and cannot be loaded",
    unloaded: "Plugin is unloaded but still registered"
  };

  return {
    code: `plugin_${state}`,
    message: messages[state],
    ...(details ? { details } : {})
  };
}

export function transitionPluginRecord(
  pluginId: string,
  current: PluginRuntimeRecord,
  nextState: PluginState
): PluginRuntimeRecord {
  const allowed = ALLOWED_PLUGIN_STATE_TRANSITIONS[current.state] ?? [];
  if (!allowed.includes(nextState)) {
    throw new PluginStateTransitionError(
      `Invalid transition for plugin "${pluginId}": "${current.state}" -> "${nextState}"`,
      {
        pluginId,
        from: current.state,
        to: nextState
      }
    );
  }

  return {
    ...current,
    state: nextState,
    statusReason: createPluginStatusReason(nextState),
    ...(nextState !== "loaded" ? { loadedAt: undefined } : {})
  };
}

export function normalizePersistedPluginState(state: PluginState): PluginState {
  if (state === "disabled" || state === "failed" || state === "unloaded") {
    return state;
  }

  return "registered";
}
