import type { I18nBundle } from "./lib/i18n.js";
import type { RenderableAdminContribution } from "./runtime/admin-route-runtime.js";

/**
 * A backoffice module is the frontend equivalent of a CMS plugin pack: it can
 * contribute one or more admin surfaces without owning the shell bootstrap.
 */
export interface BackofficeModule {
  id: string;
  contributions: readonly RenderableAdminContribution[];
  i18n?: readonly I18nBundle[];
}

/**
 * defineBackofficeModule keeps module declarations lightweight while preserving
 * full type inference for custom monorepo extensions.
 */
export function defineBackofficeModule<T extends BackofficeModule>(module: T): T {
  return module;
}
