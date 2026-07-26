import type { ModuleDefinition, TrinacriaApp } from "@trinacria/core";
import { CoreError } from "../../errors/core-error.js";

export async function registerAppModules(
  app: TrinacriaApp,
  modules: readonly ModuleDefinition[]
): Promise<void> {
  for (const moduleDefinition of modules) {
    if (!moduleDefinition || typeof moduleDefinition !== "object") {
      throw new CoreError("CMS_STARTER_INVALID_MODULE", "Invalid module provided to CMS starter");
    }
    await app.registerModule(moduleDefinition);
  }
}
