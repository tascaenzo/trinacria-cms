import type { ModuleDefinition } from "@trinacria/core";
import { PluginLifecycleError } from "../errors/plugin-errors.js";

export interface TrinacriaModuleBridgeApp {
  registerModule(module: ModuleDefinition): Promise<void>;
  unregisterModule(module: ModuleDefinition): Promise<void>;
  listModules(): string[];
}

/**
 * Bridge that maps CMS plugin module lifecycle to Trinacria runtime APIs.
 */
export class TrinacriaModuleBridge {
  constructor(private readonly app: TrinacriaModuleBridgeApp) {}

  /**
   * Registers modules in order and rolls back already-registered ones on failure.
   */
  async registerModules(
    pluginId: string,
    modules: readonly ModuleDefinition[],
  ): Promise<readonly ModuleDefinition[]> {
    const registered: ModuleDefinition[] = [];

    try {
      for (const module of modules) {
        if (this.isModuleRegistered(module)) continue;
        await this.app.registerModule(module);
        registered.push(module);
      }
      return registered;
    } catch (error) {
      const rollbackErrors = await this.unregisterModules(pluginId, registered);
      throw new PluginLifecycleError(
        `Module registration failed for plugin "${pluginId}"`,
        {
          pluginId,
          stage: "load",
          cause: this.errorToString(error),
          rollbackErrors: rollbackErrors.map((item) => this.errorToString(item)),
        },
      );
    }
  }

  /**
   * Unregisters modules in reverse order and returns collected errors.
   */
  async unregisterModules(
    _pluginId: string,
    modules: readonly ModuleDefinition[],
  ): Promise<readonly unknown[]> {
    const errors: unknown[] = [];
    for (let index = modules.length - 1; index >= 0; index -= 1) {
      const module = modules[index];
      if (!module) continue;
      if (!this.isModuleRegistered(module)) continue;
      try {
        await this.app.unregisterModule(module);
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }

  private isModuleRegistered(module: ModuleDefinition): boolean {
    return this.app.listModules().includes(module.name);
  }

  private errorToString(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return String(error);
  }
}
