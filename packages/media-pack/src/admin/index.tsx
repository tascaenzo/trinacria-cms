import {
  FileManager,
  MediaFileManager,
  type MediaFileManagerContext
} from "./media-file-manager.js";
import { MediaFileManagerModalDemo } from "./media-file-manager-modal-demo.js";
import { MediaFileManagerWidget } from "./media-file-manager-widget.js";
import {
  MediaStorageSettings,
  type MediaStorageSettingsContext
} from "./media-storage-settings.js";
import {
  MediaUploadPolicySettings,
  type MediaUploadPolicySettingsContext
} from "./media-upload-policy-settings.js";

/** React renderers intentionally live with the Media feature, not in the shell. */
export const MEDIA_PACK_ADMIN_RENDERERS = {
  pages: {
    "media-pack:file-manager": (context: MediaFileManagerContext) => (
      <MediaFileManager {...context} />
    )
  },
  settingsSections: {
    "media-pack:storage-settings": (context: MediaStorageSettingsContext) => (
      <MediaStorageSettings {...context} />
    ),
    "media-pack:upload-policy-settings": (context: MediaUploadPolicySettingsContext) => (
      <MediaUploadPolicySettings {...context} />
    )
  }
};

export type {
  MediaAsset,
  MediaFileManagerContext,
  MediaFileManagerSelection
} from "./media-file-manager.js";
export {
  FileManager,
  MediaFileManager,
  MediaFileManagerModalDemo,
  MediaFileManagerWidget,
  MediaStorageSettings,
  MediaUploadPolicySettings
};
