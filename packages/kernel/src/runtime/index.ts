// Barrel file for runtime utilities and baseline implementations.
export * from "./cms-starter.js";
export * from "./in-memory-plugin-runtime.js";
export * from "./entity-registry.js";
export * from "./kernel-health-service.js";
export * from "./kernel-system-service.js";
export * from "./mongo-db-adapter.js";
export * from "./plugin-namespace.js";
export type {
  NamespaceValidator,
  NamespaceValidationResult,
  ContributionIndex,
  CollisionRule,
  CollisionSeverity
} from "./plugin-namespace.js";
export * from "./plugin-contribution-registry.js";
export * from "./plugin-discovery-service.js";
export * from "./plugin-manifest-validation.js";
export * from "./plugin-runtime-store.js";
export * from "./permission-key.js";
export * from "./semver.js";
export * from "./trinacria-module-bridge.js";
