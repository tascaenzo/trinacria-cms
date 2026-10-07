import { defineBackofficeModule } from "@trinacria-cms/admin-kernel";
import { createCorePackPlugin } from "@trinacria-cms/core-pack";
import { createSignedPluginRequest } from "@trinacria-cms/core-pack/plugin-api";
import {
  createEditorialPackPlugin,
  type EditorialEntryOperations
} from "@trinacria-cms/editorial-pack";
import { createEmailPackPlugin, type EmailDeliveryOperations } from "@trinacria-cms/email-pack";
import type {
  OperationContext,
  PluginHostServices,
  PluginManifest
} from "@trinacria-cms/kernel/contracts";
// Host identity and repositories are unavailable in plugin/public root surfaces.
import {
  definePermission,
  definePluginManifest,
  defineSetting
} from "@trinacria-cms/kernel/plugin-api";
import { createMediaPackPlugin, type MediaAssetOperations } from "@trinacria-cms/media-pack";
import { createCmsSdkClient } from "@trinacria-cms/sdk";
import { Button } from "@trinacria-cms/trinacria-ui";
export type ConsumerContracts = [
  OperationContext,
  PluginHostServices,
  PluginManifest,
  EditorialEntryOperations,
  MediaAssetOperations,
  EmailDeliveryOperations
];
export const consumerExports = [
  definePluginManifest,
  definePermission,
  defineSetting,
  createCorePackPlugin,
  createSignedPluginRequest,
  createEditorialPackPlugin,
  createMediaPackPlugin,
  createEmailPackPlugin,
  createCmsSdkClient,
  defineBackofficeModule,
  Button
];

import type * as Core from "@trinacria-cms/core-pack";
import type * as Editorial from "@trinacria-cms/editorial-pack";
import type * as Kernel from "@trinacria-cms/kernel";
import type * as PluginApi from "@trinacria-cms/kernel/plugin-api";
import type * as Media from "@trinacria-cms/media-pack";
// @ts-expect-error host-only identity factory
export type NoPluginIdentityFactory = typeof PluginApi.createUserOperationContext;
// @ts-expect-error host-only runtime
export type NoKernelRuntime = typeof Kernel.InMemoryPluginRuntime;
// @ts-expect-error private service
export type NoCoreService = typeof Core.SettingsService;
// @ts-expect-error private repository
export type NoEditorialRepository = typeof Editorial.EntriesRepository;
// @ts-expect-error private repository
export type NoMediaRepository = typeof Media.MediaAssetsRepository;
