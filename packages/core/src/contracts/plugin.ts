import type { Container } from "./container";
import type { ProviderDefinition } from "./provider";
import type { RuntimeModule } from "./module";

export interface PluginManifest {
  id: string;
  version: string;
  requires?: string[];
}

export interface PluginContext {
  readonly pluginId: string;
  readonly container: Container;
  registerProvider<T>(provider: ProviderDefinition<T>): void;
  registerModule(module: RuntimeModule): void;
}

export interface CmsPlugin {
  readonly manifest: PluginManifest;
  register(ctx: PluginContext): Promise<void>;
  boot?(ctx: PluginContext): Promise<void>;
  shutdown?(ctx: PluginContext): Promise<void>;
}
