import type { BackofficeModule } from "@trinacria-cms/admin-kernel";

/**
 * Monorepo-local extension point for plugin admin modules. Custom plugins can
 * export their backoffice module definitions here without touching shell code.
 */
export const backofficeModules: readonly BackofficeModule[] = [];
