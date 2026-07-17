import { createCapabilityToken, createToken } from "@trinacria-cms/kernel";
import type { MediaProviderRegistry } from "./media-provider-registry.service.js";
import type { LocalDiskMediaStorageProvider } from "./providers/local-disk-media-storage.provider.js";
import type { MediaAssetsRepository } from "./repositories/media-assets.repository.js";
import type { MediaUploadsRepository } from "./repositories/media-uploads.repository.js";
import type { MediaDirectoriesRepository } from "./repositories/media-directories.repository.js";
import type { MediaAssetsService } from "./services/media-assets.service.js";
import type { MediaUploadsService } from "./services/media-uploads.service.js";
import type { MediaDirectoriesService } from "./services/media-directories.service.js";
import type { MediaStorageConfigService } from "./services/media-storage-config.service.js";
import type { MediaDomainEventsService } from "./services/media-domain-events.service.js";
import type { MediaUploadController } from "./media-upload.controller.js";
import type { MediaAssetsController } from "./media-assets.controller.js";

export const MEDIA_PROVIDER_REGISTRY_TOKEN = createCapabilityToken<MediaProviderRegistry>(
  "media-pack.storage.providers"
);

export const MEDIA_ASSETS_REPOSITORY_TOKEN = createToken<MediaAssetsRepository>(
  "MEDIA_PACK_ASSETS_REPOSITORY"
);

export const MEDIA_ASSETS_SERVICE_TOKEN = createCapabilityToken<MediaAssetsService>(
  "media-pack.assets.service"
);

export const MEDIA_UPLOADS_REPOSITORY_TOKEN = createToken<MediaUploadsRepository>(
  "MEDIA_PACK_UPLOADS_REPOSITORY"
);

export const MEDIA_DIRECTORIES_REPOSITORY_TOKEN = createToken<MediaDirectoriesRepository>(
  "MEDIA_PACK_DIRECTORIES_REPOSITORY"
);

export const MEDIA_DIRECTORIES_SERVICE_TOKEN = createCapabilityToken<MediaDirectoriesService>(
  "media-pack.directories.service"
);

export const MEDIA_UPLOADS_SERVICE_TOKEN = createCapabilityToken<MediaUploadsService>(
  "media-pack.uploads.service"
);

export const MEDIA_STORAGE_CONFIG_SERVICE_TOKEN = createCapabilityToken<MediaStorageConfigService>(
  "media-pack.storage.config"
);

export const MEDIA_DOMAIN_EVENTS_SERVICE_TOKEN = createToken<MediaDomainEventsService>(
  "MEDIA_PACK_DOMAIN_EVENTS_SERVICE"
);

export const MEDIA_UPLOAD_CONTROLLER_TOKEN = createToken<MediaUploadController>(
  "MEDIA_PACK_UPLOAD_CONTROLLER"
);

export const MEDIA_ASSETS_CONTROLLER_TOKEN = createToken<MediaAssetsController>(
  "MEDIA_PACK_ASSETS_CONTROLLER"
);

export const MEDIA_LOCAL_DISK_PROVIDER_TOKEN = createToken<LocalDiskMediaStorageProvider>(
  "MEDIA_PACK_LOCAL_DISK_PROVIDER"
);

export const MEDIA_PROVIDER_REGISTRY_INITIALIZATION_TOKEN = createToken<boolean>(
  "MEDIA_PACK_PROVIDER_REGISTRY_INITIALIZATION"
);

export const MEDIA_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "MEDIA_PACK_ENTITY_REGISTRATION"
);
