import type { PluginRuntimeRecord } from "../../contracts/plugin-runtime.js";
import type { PersistedPluginRuntimeRecord } from "../../contracts/plugin-runtime-store.js";
import {
  createPluginStatusReason,
  normalizePersistedPluginState
} from "./plugin-runtime-state-machine.js";

export function fromPersistedRuntimeRecord(
  persisted: PersistedPluginRuntimeRecord
): PluginRuntimeRecord {
  const state = normalizePersistedPluginState(persisted.state);
  const lastError = persisted.lastErrorMessage
    ? Object.assign(new Error(persisted.lastErrorMessage), {
        name: persisted.lastErrorName ?? "PluginRuntimeError"
      })
    : undefined;

  return {
    manifest: persisted.manifest,
    state,
    ...(lastError ? { lastError } : {}),
    failureCount: persisted.failureCount,
    ...(persisted.failedAt ? { failedAt: new Date(persisted.failedAt) } : {}),
    ...(persisted.lastFailurePhase ? { lastFailurePhase: persisted.lastFailurePhase } : {}),
    ...(persisted.disabledAt ? { disabledAt: new Date(persisted.disabledAt) } : {}),
    ...(persisted.disabledReason ? { disabledReason: persisted.disabledReason } : {}),
    statusReason:
      state === persisted.state
        ? persisted.statusReason
        : createPluginStatusReason(state, {
            rehydratedFromState: persisted.state
          })
  };
}
