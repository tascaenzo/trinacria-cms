import type { PluginManifestAdmin } from "@trinacria-cms/kernel/contracts";
import {
  defineAdmin,
  defineAdminNavigation,
  defineAdminRoute,
  defineAdminSettingsSection,
  defineAdminWidget
} from "@trinacria-cms/kernel/plugin-api";
import { MEDIA_PACK_PERMISSION_KEYS } from "./media-pack.security.js";

/** Declarative admin contribution; a host can attach richer picker components later. */
export const MEDIA_PACK_ADMIN_MANIFEST: PluginManifestAdmin = defineAdmin({
  widgets: [
    defineAdminWidget({
      id: "media-file-manager",
      label: "File manager",
      componentRef: "media-pack:file-manager-widget",
      requiredPermission: MEDIA_PACK_PERMISSION_KEYS.ASSETS_READ,
      layout: {
        defaultColumnSpan: 2,
        defaultRowSpan: 2,
        minColumnSpan: 2,
        maxColumnSpan: 4,
        minRowSpan: 2,
        maxRowSpan: 3
      }
    })
  ],
  routes: [
    defineAdminRoute({
      id: "media-assets",
      path: "/media/assets",
      label: "Media",
      requiredPermission: MEDIA_PACK_PERMISSION_KEYS.ASSETS_READ,
      componentRef: "media-pack:file-manager",
      order: 70
    }),
    defineAdminRoute({
      id: "media-picker-demo",
      path: "/media/picker-demo",
      label: "Selettore media",
      requiredPermission: MEDIA_PACK_PERMISSION_KEYS.ASSETS_READ,
      componentRef: "media-pack:file-manager-modal-demo",
      order: 71
    })
  ],
  navigation: [
    defineAdminNavigation({
      id: "nav-media-assets",
      path: "/media/assets",
      label: "Media",
      requiredPermission: MEDIA_PACK_PERMISSION_KEYS.ASSETS_READ,
      order: 70
    }),
    defineAdminNavigation({
      id: "nav-media-picker-demo",
      path: "/media/picker-demo",
      label: "Selettore media",
      requiredPermission: MEDIA_PACK_PERMISSION_KEYS.ASSETS_READ,
      order: 71
    })
  ],
  settingsSections: [
    defineAdminSettingsSection({
      id: "media-pack-storage-settings",
      label: "Archiviazione media",
      kind: "custom",
      componentRef: "media-pack:storage-settings",
      namespace: "storage",
      settingKeys: [
        "media-pack:storage:default_provider_id",
        "media-pack:storage:local_root",
        "media-pack:storage:s3_endpoint",
        "media-pack:storage:s3_bucket",
        "media-pack:storage:s3_region",
        "media-pack:storage:s3_access_key",
        "media-pack:storage:s3_secret_key"
      ],
      requiredPermission: MEDIA_PACK_PERMISSION_KEYS.SETTINGS_MANAGE,
      order: 70
    }),
    defineAdminSettingsSection({
      id: "media-pack-limits-settings",
      label: "Limiti media",
      kind: "custom",
      componentRef: "media-pack:upload-policy-settings",
      namespace: "limits",
      settingKeys: [
        "media-pack:limits:max_file_bytes",
        "media-pack:limits:allowed_mime_types",
        "media-pack:limits:max_image_pixels"
      ],
      requiredPermission: MEDIA_PACK_PERMISSION_KEYS.SETTINGS_MANAGE,
      order: 71
    })
  ]
});
