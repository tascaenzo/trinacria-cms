import type { PluginRuntimeRecord } from "../../contracts/plugin-runtime.js";
import type { PluginRuntimeStore } from "../../contracts/plugin-runtime-store.js";
import { fromPersistedRuntimeRecord } from "./plugin-runtime-rehydration.js";

export async function persistRecord(
  records: Map<string, PluginRuntimeRecord>,
  runtimeStore: PluginRuntimeStore,
  pluginId: string
): Promise<void> {
  const record = records.get(pluginId);
  if (!record) return;
  await runtimeStore.upsert(record);
}

export async function hydrateFromRuntimeStore(
  records: Map<string, PluginRuntimeRecord>,
  runtimeStore: PluginRuntimeStore
): Promise<void> {
  const persistedRecords = await runtimeStore.list();
  for (const persisted of persistedRecords) {
    if (records.has(persisted.pluginId)) continue;
    records.set(persisted.pluginId, fromPersistedRuntimeRecord(persisted));
  }
}
