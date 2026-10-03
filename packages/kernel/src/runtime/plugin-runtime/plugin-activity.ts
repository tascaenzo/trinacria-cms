export class PluginDrainError extends Error {
  readonly code = "plugin_draining";
}
interface Activity {
  active: number;
  blocked: boolean;
  controller: AbortController;
  waiters: Set<() => void>;
}
/** Host registry. A timeout never pretends that JavaScript has been stopped. */
export class PluginActivityRegistry {
  private readonly owners = new Map<string, Activity>();
  private state(owner: string): Activity {
    let value = this.owners.get(owner);
    if (!value) {
      value = { active: 0, blocked: false, controller: new AbortController(), waiters: new Set() };
      this.owners.set(owner, value);
    }
    return value;
  }
  resume(owner: string): void {
    const state = this.state(owner);
    if (state.active) throw new PluginDrainError("Cannot resume an owner with undrained work");
    state.controller = new AbortController();
    state.blocked = false;
  }
  block(owner: string): void {
    const state = this.state(owner);
    state.blocked = true;
    state.controller.abort(new PluginDrainError("Plugin draining"));
  }
  async run<T>(owners: readonly string[], work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const states = [...new Set(owners)].map((owner) => this.state(owner));
    if (states.some((state) => state.blocked))
      throw new PluginDrainError("Plugin does not accept new operations during drain");
    for (const state of states) state.active++;
    const signal = states.length
      ? AbortSignal.any(states.map((state) => state.controller.signal))
      : new AbortController().signal;
    try {
      return await work(signal);
    } finally {
      for (const state of states) {
        state.active--;
        if (!state.active) for (const resolve of state.waiters) resolve();
      }
    }
  }
  async drain(owner: string, timeoutMs = 30000): Promise<void> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000)
      throw new PluginDrainError("Invalid drain timeout");
    const state = this.state(owner);
    this.block(owner);
    if (!state.active) return;
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        clearTimeout(timer);
        state.waiters.delete(done);
        resolve();
      };
      const timer = setTimeout(() => {
        state.waiters.delete(done);
        reject(
          new PluginDrainError(
            "Plugin work remains active; stop the instance before uninstall/purge"
          )
        );
      }, timeoutMs);
      state.waiters.add(done);
    });
  }
  snapshot(owner: string): { active: number; blocked: boolean } {
    const state = this.state(owner);
    return { active: state.active, blocked: state.blocked };
  }
}
