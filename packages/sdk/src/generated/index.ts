/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore } from "../runtime/types.js";
import { createAuthApi, type AuthApi } from "./auth.gen.js";
import { createSecurityApi, type SecurityApi } from "./security.gen.js";
import { createInstallationApi, type InstallationApi } from "./installation.gen.js";
import { createPermissionsApi, type PermissionsApi } from "./permissions.gen.js";
import { createRolesApi, type RolesApi } from "./roles.gen.js";
import { createUsersApi, type UsersApi } from "./users.gen.js";
import { createSystemApi, type SystemApi } from "./system.gen.js";
import { createSettingsApi, type SettingsApi } from "./settings.gen.js";
import { createKernelHealthApi, type KernelHealthApi } from "./kernelHealth.gen.js";
import { createEmailApi, type EmailApi } from "./email.gen.js";
export * from "./types.gen.js";
export type { AuthApi } from "./auth.gen.js";
export type { SecurityApi } from "./security.gen.js";
export type { InstallationApi } from "./installation.gen.js";
export type { PermissionsApi } from "./permissions.gen.js";
export type { RolesApi } from "./roles.gen.js";
export type { UsersApi } from "./users.gen.js";
export type { SystemApi } from "./system.gen.js";
export type { SettingsApi } from "./settings.gen.js";
export type { KernelHealthApi } from "./kernelHealth.gen.js";
export type { EmailApi } from "./email.gen.js";

export interface GeneratedCmsSdk {
  auth: AuthApi;
  security: SecurityApi;
  installation: InstallationApi;
  permissions: PermissionsApi;
  roles: RolesApi;
  users: UsersApi;
  system: SystemApi;
  settings: SettingsApi;
  kernelHealth: KernelHealthApi;
  email: EmailApi;
}

export function createGeneratedCmsSdk(client: CmsSdkClientCore): GeneratedCmsSdk {
  return {
    auth: createAuthApi(client),
    security: createSecurityApi(client),
    installation: createInstallationApi(client),
    permissions: createPermissionsApi(client),
    roles: createRolesApi(client),
    users: createUsersApi(client),
    system: createSystemApi(client),
    settings: createSettingsApi(client),
    kernelHealth: createKernelHealthApi(client),
    email: createEmailApi(client),
  };
}
