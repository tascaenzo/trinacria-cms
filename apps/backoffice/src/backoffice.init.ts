import type { MountBackofficeOptions } from "@trinacria-cms/admin-kernel";
import { backofficeModules } from "./custom-backoffice-modules.js";

/**
 * The host app only owns mount-time configuration. Official shell logic stays
 * in the shared admin-kernel package, while local modules remain optional here.
 */
export const backofficeOptions: MountBackofficeOptions = {
  apiBaseUrl: import.meta.env.VITE_CMS_API_BASE_URL ?? "http://127.0.0.1:3000",
  modules: backofficeModules
};
