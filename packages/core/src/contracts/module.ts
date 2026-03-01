import type { Container } from "./container";

export interface ModuleMeta {
  id: string;
  version: string;
  capabilities?: string[];
}

export interface ModuleContext {
  readonly pluginId?: string;
  readonly container: Container;
}

export interface RuntimeModule {
  readonly meta: ModuleMeta;
  register(ctx: ModuleContext): Promise<void>;
  boot?(ctx: ModuleContext): Promise<void>;
  shutdown?(ctx: ModuleContext): Promise<void>;
}
