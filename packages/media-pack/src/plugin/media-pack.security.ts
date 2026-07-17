import { definePermissionSet } from "@trinacria-cms/kernel/plugin-api";
import { MEDIA_PACK_PLUGIN_ID } from "./media-pack.constants.js";

export const MEDIA_PACK_CAPABILITIES = {
  ASSETS: "media.assets",
  DIRECTORIES: "media.directories",
  STORAGE: "media.storage"
} as const;

export type MediaPackCapability =
  (typeof MEDIA_PACK_CAPABILITIES)[keyof typeof MEDIA_PACK_CAPABILITIES];

export const MEDIA_PACK_CAPABILITY_LIST: readonly MediaPackCapability[] = Object.freeze(
  Object.values(MEDIA_PACK_CAPABILITIES)
);

const MEDIA_PACK_PERMISSIONS = definePermissionSet(MEDIA_PACK_PLUGIN_ID, {
  ASSETS_READ: {
    resource: "assets",
    action: "read",
    displayName: "Read media assets"
  },
  ASSETS_UPLOAD: {
    resource: "assets",
    action: "upload",
    displayName: "Upload media assets"
  },
  ASSETS_UPDATE: {
    resource: "assets",
    action: "update",
    displayName: "Update media assets"
  },
  ASSETS_DELETE: {
    resource: "assets",
    action: "delete",
    displayName: "Delete media assets"
  },
  DIRECTORIES_MANAGE: {
    resource: "directories",
    action: "manage",
    displayName: "Manage media directories"
  },
  SHARES_MANAGE: {
    resource: "shares",
    action: "manage",
    displayName: "Manage media sharing"
  },
  SETTINGS_MANAGE: {
    resource: "settings",
    action: "manage",
    displayName: "Manage media settings"
  }
});

export const MEDIA_PACK_PERMISSION_KEYS = MEDIA_PACK_PERMISSIONS.keys;

export type MediaPackPermissionKey =
  (typeof MEDIA_PACK_PERMISSION_KEYS)[keyof typeof MEDIA_PACK_PERMISSION_KEYS];

export const MEDIA_PACK_PERMISSION_DEFINITIONS = Object.freeze(MEDIA_PACK_PERMISSIONS.permissions);

export const MEDIA_PACK_PERMISSION_KEY_LIST: readonly MediaPackPermissionKey[] = Object.freeze(
  MEDIA_PACK_PERMISSION_DEFINITIONS.map((permission) => permission.key)
);
