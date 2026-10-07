/** Host-only installation coordination. Plugin hooks must be idempotent. */
export interface InstallationCheck {
  id:
    | "database"
    | "transactions"
    | "write-access"
    | "runtime-keys"
    | "plugins"
    | "services"
    | "administrator"
    | "settings";
  status: "pass" | "fail" | "blocked";
  message: string;
}
export interface PluginInstallationInput {
  dataMode: "empty" | "demo";
  adminUserId: string;
}
export interface InstallationHost {
  inspect(): Promise<{ installed?: boolean; checks: readonly InstallationCheck[] }>;
  initialize(input: PluginInstallationInput): Promise<void>;
  verify(): Promise<readonly InstallationCheck[]>;
}
