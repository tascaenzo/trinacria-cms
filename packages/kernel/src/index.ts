import "./types/trinacria-http.js";

// Public entrypoint of the kernel package.
export * from "./contracts/index.js";
export * from "./errors/index.js";
export * from "./http/index.js";
export * from "./plugin-api/index.js";
export * from "./runtime/index.js";
export * from "./tokens/index.js";

// Re-export Trinacria foundations so CMS plugins can import from a single package.
export {
  classProvider,
  createToken,
  defineModule,
  factoryProvider,
  TrinacriaApp,
  valueProvider,
  type ApplicationContext,
  type ModuleDefinition,
  type Provider,
  type Token
} from "@trinacria/core";
export * from "@trinacria/http";
export * from "@trinacria/schema";
export * from "@trinacria/events";
