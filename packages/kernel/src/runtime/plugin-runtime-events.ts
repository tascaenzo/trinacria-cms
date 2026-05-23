import type { PluginRuntimeEvent } from "../contracts/plugin-runtime.js";

export interface PluginRuntimeEventLogOptions {
  bufferSize?: number;
  onEvent?: (event: PluginRuntimeEvent) => void;
}

export class PluginRuntimeEventLog {
  private readonly bufferSize: number;
  private readonly onEvent?: (event: PluginRuntimeEvent) => void;
  private readonly eventLog: PluginRuntimeEvent[] = [];
  private eventSequence = 0;

  constructor(options: PluginRuntimeEventLogOptions = {}) {
    this.bufferSize = Math.max(1, options.bufferSize ?? 200);
    this.onEvent = options.onEvent;
  }

  list(options?: { pluginId?: string; limit?: number }): readonly PluginRuntimeEvent[] {
    const normalizedPluginId = options?.pluginId?.trim();
    const filtered = normalizedPluginId
      ? this.eventLog.filter((event) => event.pluginId === normalizedPluginId)
      : this.eventLog;
    const normalizedLimit =
      typeof options?.limit === "number" && Number.isFinite(options.limit)
        ? Math.max(1, Math.floor(options.limit))
        : filtered.length;

    return filtered.slice(-normalizedLimit);
  }

  emit(event: Omit<PluginRuntimeEvent, "timestamp" | "sequence">): void {
    const payload: PluginRuntimeEvent = {
      ...event,
      sequence: ++this.eventSequence,
      timestamp: new Date()
    };

    this.eventLog.push(payload);
    if (this.eventLog.length > this.bufferSize) {
      this.eventLog.splice(0, this.eventLog.length - this.bufferSize);
    }

    this.onEvent?.(payload);
  }
}
