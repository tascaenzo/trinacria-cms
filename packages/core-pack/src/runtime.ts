// Advanced host composition. Never expose this surface to plugin code through host services.
export * from "./admin-i18n/index.js";
export * from "./infra/index.js";
export * from "./modules/index.js";
export { CorePackOfflineInstallerModule } from "./modules/installation/offline-installer.module.js";
export * from "./modules/security/audit/security-audit.js";
export * from "./operations/access-operations.js";
export * from "./operations/auth-flow-operations.js";
export * from "./operations/core-operation-authorizer.js";
export * from "./operations/plugin-grant-operations.js";
export * from "./operations/settings-operations.js";
export * from "./plugin/index.js";
export * from "./plugin-api/index.js";
