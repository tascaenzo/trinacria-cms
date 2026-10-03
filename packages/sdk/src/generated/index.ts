/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore } from "../runtime/types.js";
import { createAuthApi, type AuthApi } from "./auth.gen.js";
import { createEditorialApi, type EditorialApi } from "./editorial.gen.js";
import { createSecurityApi, type SecurityApi } from "./security.gen.js";
import { createInstallationApi, type InstallationApi } from "./installation.gen.js";
import { createSystemApi, type SystemApi } from "./system.gen.js";
import { createMediaApi, type MediaApi } from "./media.gen.js";
import { createPreviewApi, type PreviewApi } from "./preview.gen.js";
import { createPermissionsApi, type PermissionsApi } from "./permissions.gen.js";
import { createRolesApi, type RolesApi } from "./roles.gen.js";
import { createUsersApi, type UsersApi } from "./users.gen.js";
import { createSettingsApi, type SettingsApi } from "./settings.gen.js";
import { createInternationalizationApi, type InternationalizationApi } from "./internationalization.gen.js";
import { createKernelHealthApi, type KernelHealthApi } from "./kernelHealth.gen.js";
import { createDeliveryApi, type DeliveryApi } from "./delivery.gen.js";
import { createEmailApi, type EmailApi } from "./email.gen.js";
export * from "./types.gen.js";
export type { AuthApi } from "./auth.gen.js";
export type { EditorialApi } from "./editorial.gen.js";
export type { SecurityApi } from "./security.gen.js";
export type { InstallationApi } from "./installation.gen.js";
export type { SystemApi } from "./system.gen.js";
export type { MediaApi } from "./media.gen.js";
export type { PreviewApi } from "./preview.gen.js";
export type { PermissionsApi } from "./permissions.gen.js";
export type { RolesApi } from "./roles.gen.js";
export type { UsersApi } from "./users.gen.js";
export type { SettingsApi } from "./settings.gen.js";
export type { InternationalizationApi } from "./internationalization.gen.js";
export type { KernelHealthApi } from "./kernelHealth.gen.js";
export type { DeliveryApi } from "./delivery.gen.js";
export type { EmailApi } from "./email.gen.js";

export interface GeneratedCmsSdk {
  auth: AuthApi;
  editorial: EditorialApi;
  security: SecurityApi;
  installation: InstallationApi;
  system: SystemApi;
  media: MediaApi;
  preview: PreviewApi;
  permissions: PermissionsApi;
  roles: RolesApi;
  users: UsersApi;
  settings: SettingsApi;
  internationalization: InternationalizationApi;
  kernelHealth: KernelHealthApi;
  delivery: DeliveryApi;
  email: EmailApi;
}

export function createGeneratedCmsSdk(client: CmsSdkClientCore): GeneratedCmsSdk {
  return {
    auth: createAuthApi(client),
    editorial: createEditorialApi(client),
    security: createSecurityApi(client),
    installation: createInstallationApi(client),
    system: createSystemApi(client),
    media: createMediaApi(client),
    preview: createPreviewApi(client),
    permissions: createPermissionsApi(client),
    roles: createRolesApi(client),
    users: createUsersApi(client),
    settings: createSettingsApi(client),
    internationalization: createInternationalizationApi(client),
    kernelHealth: createKernelHealthApi(client),
    delivery: createDeliveryApi(client),
    email: createEmailApi(client),
  };
}
