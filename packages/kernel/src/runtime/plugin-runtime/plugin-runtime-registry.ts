import type { ModuleDefinition } from "@trinacria/core";
import type {
  KernelPluginDefinition,
  PluginRuntimeRecord,
  PluginState
} from "../../contracts/plugin-runtime.js";
import {
  PluginManifestError,
  PluginRuntimeError
} from "../../errors/plugin-errors.js";
import { PluginContributionRegistry } from "./plugin-runtime-contributions.js";
import { createNamespaceValidator } from "../plugin-namespace/plugin-namespace-validator.js";
import type { NamespaceValidator } from "../plugin-namespace/plugin-namespace.js";
import { transitionPluginRecord } from "./plugin-runtime-state-machine.js";

export class PluginRegistryManager {
  readonly records = new Map<string, PluginRuntimeRecord>();
  readonly definitions = new Map<string, KernelPluginDefinition>();
  readonly pluginModules = new Map<string, readonly ModuleDefinition[]>();
  readonly registrationValidator = new PluginContributionRegistry();
  readonly namespaceValidator: NamespaceValidator = createNamespaceValidator();

  getRecord(pluginId: string): PluginRuntimeRecord {
    const record = this.records.get(pluginId);
    if (!record) {
      throw new PluginRuntimeError(`Plugin "${pluginId}" is not registered`, { pluginId });
    }
    return record;
  }

  getDefinition(pluginId: string): KernelPluginDefinition {
    const definition = this.definitions.get(pluginId);
    if (!definition) {
      throw new PluginRuntimeError(`Plugin "${pluginId}" has no definition`, { pluginId });
    }
    return definition;
  }

  assertNamespaceValid(manifest: PluginRuntimeRecord["manifest"]): void {
    const result = this.namespaceValidator.validateManifest(manifest);
    if (!result.valid) {
      throw new PluginManifestError(`Plugin "${manifest.id}" namespace validation failed`, {
        pluginId: manifest.id,
        errors: result.errors
      });
    }
  }

  registerNamespace(manifest: PluginRuntimeRecord["manifest"]): void {
    const result = this.namespaceValidator.registerPlugin(manifest);
    if (!result.valid) {
      throw new PluginManifestError(`Plugin "${manifest.id}" namespace registration failed`, {
        pluginId: manifest.id,
        errors: result.errors
      });
    }
  }

  unregisterNamespace(pluginId: string): void {
    this.namespaceValidator.unregisterPlugin(pluginId);
  }

  removePlugin(pluginId: string): void {
    this.records.delete(pluginId);
    this.definitions.delete(pluginId);
    this.pluginModules.delete(pluginId);
    this.registrationValidator.remove(pluginId);
    this.unregisterNamespace(pluginId);
  }

  transition(pluginId: string, nextState: PluginState): void {
    this.records.set(
      pluginId,
      transitionPluginRecord(pluginId, this.getRecord(pluginId), nextState)
    );
  }

  normalizeDefinition(
    plugin: KernelPluginDefinition | PluginRuntimeRecord["manifest"]
  ): KernelPluginDefinition {
    if ("manifest" in plugin) {
      return { ...plugin, modules: plugin.modules ?? [] };
    }
    return { manifest: plugin, modules: [] };
  }
}
