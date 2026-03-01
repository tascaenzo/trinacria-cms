import type { Container, Token } from "../contracts/container";
import type { ModuleContext, RuntimeModule } from "../contracts/module";
import type { CmsPlugin, PluginContext } from "../contracts/plugin";
import { CORE_TOKENS, type ProviderDefinition } from "../contracts/provider";
import { createPluginScopedDbClient } from "./db-scoping";

class InMemoryContainer implements Container {
  private readonly registry = new Map<Token, unknown>();

  register<T>(token: Token<T>, value: T): void {
    this.registry.set(token, value);
  }

  resolve<T>(token: Token<T>): T {
    if (!this.registry.has(token)) {
      throw new Error(`Provider not found: ${String(token)}`);
    }

    return this.registry.get(token) as T;
  }

  has(token: Token): boolean {
    return this.registry.has(token);
  }

  createScope(_name: string): Container {
    const scoped = new InMemoryContainer();

    for (const [token, value] of this.registry.entries()) {
      scoped.register(token, value);
    }

    return scoped;
  }
}

export class CmsKernel {
  private readonly rootContainer: Container;
  private readonly plugins = new Map<string, { plugin: CmsPlugin; context: PluginContext }>();
  private readonly pluginOrder: string[] = [];
  private readonly modules: Array<{ module: RuntimeModule; context: ModuleContext }> = [];
  private readonly moduleIds = new Set<string>();

  constructor(container: Container = new InMemoryContainer()) {
    this.rootContainer = container;
  }

  registerProvider<T>(provider: ProviderDefinition<T>): void {
    if (!provider.allowOverride && this.rootContainer.has(provider.token)) {
      throw new Error(`Provider already exists: ${String(provider.token)}`);
    }

    this.rootContainer.register(provider.token, provider.value);
  }

  registerModule(module: RuntimeModule): void {
    this.pushModule(module, { container: this.rootContainer });
  }

  async registerPlugin(plugin: CmsPlugin): Promise<void> {
    const pluginId = plugin.manifest.id;

    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin already registered: ${pluginId}`);
    }

    for (const dep of plugin.manifest.requires ?? []) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Missing dependency \"${dep}\" for plugin \"${pluginId}\"`);
      }
    }

    const pluginContainer = this.rootContainer.createScope(pluginId);
    this.attachPluginDbProvider(pluginContainer, pluginId);

    const ctx: PluginContext = {
      pluginId,
      container: pluginContainer,
      registerProvider: (provider) => {
        if (!provider.allowOverride && pluginContainer.has(provider.token)) {
          throw new Error(`Provider already exists in plugin scope: ${String(provider.token)}`);
        }

        pluginContainer.register(provider.token, provider.value);
      },
      registerModule: (module) => {
        this.pushModule(module, { pluginId, container: pluginContainer });
      }
    };

    await plugin.register(ctx);
    this.plugins.set(pluginId, { plugin, context: ctx });
    this.pluginOrder.push(pluginId);
  }

  async boot(): Promise<void> {
    for (const entry of this.modules) {
      await entry.module.register(entry.context);
    }

    for (const pluginId of this.pluginOrder) {
      const entry = this.plugins.get(pluginId);
      await entry?.plugin.boot?.(entry.context);
    }

    for (const entry of this.modules) {
      await entry.module.boot?.(entry.context);
    }
  }

  async shutdown(): Promise<void> {
    for (const entry of [...this.modules].reverse()) {
      await entry.module.shutdown?.(entry.context);
    }

    for (const pluginId of [...this.pluginOrder].reverse()) {
      const entry = this.plugins.get(pluginId);
      await entry?.plugin.shutdown?.(entry.context);
    }
  }

  private pushModule(module: RuntimeModule, context: ModuleContext): void {
    const uniqueModuleId = context.pluginId
      ? `${context.pluginId}:${module.meta.id}`
      : module.meta.id;

    if (this.moduleIds.has(uniqueModuleId)) {
      throw new Error(`Module already registered: ${uniqueModuleId}`);
    }

    this.moduleIds.add(uniqueModuleId);
    this.modules.push({ module, context });
  }

  private attachPluginDbProvider(pluginContainer: Container, pluginId: string): void {
    if (!this.rootContainer.has(CORE_TOKENS.db)) {
      return;
    }

    const rootDb = this.rootContainer.resolve(CORE_TOKENS.db);
    const pluginDb = createPluginScopedDbClient(rootDb, pluginId);
    pluginContainer.register(CORE_TOKENS.db, pluginDb);
  }
}
