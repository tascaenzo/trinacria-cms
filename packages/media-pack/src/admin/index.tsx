import {
  MediaStorageSettings,
  type MediaStorageSettingsContext
} from "./media-storage-settings.js";
import {
  MediaUploadPolicySettings,
  type MediaUploadPolicySettingsContext
} from "./media-upload-policy-settings.js";
import {
  FileManager,
  MediaFileManager,
  type MediaFileManagerContext
} from "./media-file-manager.js";
import { MediaFileManagerModalDemo } from "./media-file-manager-modal-demo.js";
import {
  MediaFileManagerWidget,
  type MediaFileManagerWidgetContext
} from "./media-file-manager-widget.js";

/** React renderers intentionally live with the Media feature, not in the shell. */
export const MEDIA_PACK_ADMIN_RENDERERS = {
  dashboardWidgets: {
    "media-pack:file-manager-widget": (context: MediaFileManagerWidgetContext) => (
      <MediaFileManagerWidget {...context} />
    )
  },
  pages: {
    "media-pack:file-manager": (context: MediaFileManagerContext) => (
      <MediaFileManager {...context} />
    ),
    "media-pack:file-manager-modal-demo": (context: MediaFileManagerContext) => (
      <MediaFileManagerModalDemo {...context} />
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

export { MediaStorageSettings };
export { MediaUploadPolicySettings };
export { MediaFileManager };
export { FileManager };
export { MediaFileManagerModalDemo };
export { MediaFileManagerWidget };
