import {
  classProvider,
  CORE_TOKENS,
  defineModule,
  factoryProvider,
  httpProvider,
  type EntityRegistry,
  type ModuleDefinition
} from "@trinacria-cms/kernel";
import {
  CorePackAuthModule,
  CorePackRuntimeConfigModule,
  CorePackSettingsModule,
  CorePackSecurityModule,
  CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
  RUNTIME_CONFIG_SERVICE_TOKEN,
  SETTINGS_SERVICE_TOKEN
} from "@trinacria-cms/core-pack";
import { MediaAssetsController } from "./media-assets.controller.js";
import { MediaUploadController } from "./media-upload.controller.js";
import { MediaProviderRegistry } from "./media-provider-registry.service.js";
import { LocalDiskMediaStorageProvider } from "./providers/local-disk-media-storage.provider.js";
import { MediaAssetsRepository } from "./repositories/media-assets.repository.js";
import { MediaDirectoriesRepository } from "./repositories/media-directories.repository.js";
import { MediaUploadsRepository } from "./repositories/media-uploads.repository.js";
import { MediaAssetsService } from "./services/media-assets.service.js";
import { MediaDirectoriesService } from "./services/media-directories.service.js";
import { MediaUploadsService } from "./services/media-uploads.service.js";
import { MediaStorageConfigService } from "./services/media-storage-config.service.js";
import { MediaDomainEventsService } from "./services/media-domain-events.service.js";
import {
  MEDIA_ACL_ENTRIES_ENTITY,
  MEDIA_ASSETS_ENTITY,
  MEDIA_DIRECTORIES_ENTITY,
  MEDIA_UPLOADS_ENTITY
} from "./media.schemas.js";
import {
  MEDIA_ASSETS_REPOSITORY_TOKEN,
  MEDIA_ASSETS_SERVICE_TOKEN,
  MEDIA_ASSETS_CONTROLLER_TOKEN,
  MEDIA_DIRECTORIES_REPOSITORY_TOKEN,
  MEDIA_DIRECTORIES_SERVICE_TOKEN,
  MEDIA_DOMAIN_EVENTS_SERVICE_TOKEN,
  MEDIA_ENTITY_REGISTRATION_TOKEN,
  MEDIA_LOCAL_DISK_PROVIDER_TOKEN,
  MEDIA_UPLOAD_CONTROLLER_TOKEN,
  MEDIA_UPLOADS_REPOSITORY_TOKEN,
  MEDIA_UPLOADS_SERVICE_TOKEN,
  MEDIA_PROVIDER_REGISTRY_INITIALIZATION_TOKEN,
  MEDIA_PROVIDER_REGISTRY_TOKEN,
  MEDIA_STORAGE_CONFIG_SERVICE_TOKEN
} from "./media.tokens.js";

export const MediaPackMediaModule: ModuleDefinition = defineModule({
  name: "MediaPackMediaModule",
  imports: [
    CorePackAuthModule,
    CorePackSecurityModule,
    CorePackRuntimeConfigModule,
    CorePackSettingsModule
  ],
  providers: [
    factoryProvider(
      MEDIA_ENTITY_REGISTRATION_TOKEN,
      (registry) => {
        const entityRegistry = registry as EntityRegistry;
        entityRegistry.register(MEDIA_ASSETS_ENTITY);
        entityRegistry.register(MEDIA_DIRECTORIES_ENTITY);
        entityRegistry.register(MEDIA_ACL_ENTRIES_ENTITY);
        entityRegistry.register(MEDIA_UPLOADS_ENTITY);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    classProvider(MEDIA_PROVIDER_REGISTRY_TOKEN, MediaProviderRegistry),
    factoryProvider(
      MEDIA_LOCAL_DISK_PROVIDER_TOKEN,
      () => new LocalDiskMediaStorageProvider({ rootDirectory: ".trinacria/media" }),
      []
    ),
    factoryProvider(
      MEDIA_PROVIDER_REGISTRY_INITIALIZATION_TOKEN,
      (registry, localDiskProvider) => {
        (registry as MediaProviderRegistry).register(
          localDiskProvider as LocalDiskMediaStorageProvider
        );
        return true;
      },
      [MEDIA_PROVIDER_REGISTRY_TOKEN, MEDIA_LOCAL_DISK_PROVIDER_TOKEN]
    ),
    classProvider(MEDIA_ASSETS_REPOSITORY_TOKEN, MediaAssetsRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(MEDIA_DOMAIN_EVENTS_SERVICE_TOKEN, MediaDomainEventsService),
    classProvider(MEDIA_ASSETS_SERVICE_TOKEN, MediaAssetsService, [
      MEDIA_ASSETS_REPOSITORY_TOKEN,
      MEDIA_DIRECTORIES_REPOSITORY_TOKEN,
      MEDIA_DOMAIN_EVENTS_SERVICE_TOKEN
    ]),
    classProvider(MEDIA_DIRECTORIES_REPOSITORY_TOKEN, MediaDirectoriesRepository, [
      CORE_TOKENS.DB_ADAPTER
    ]),
    classProvider(MEDIA_DIRECTORIES_SERVICE_TOKEN, MediaDirectoriesService, [
      MEDIA_DIRECTORIES_REPOSITORY_TOKEN,
      MEDIA_ASSETS_REPOSITORY_TOKEN
    ]),
    classProvider(MEDIA_UPLOADS_REPOSITORY_TOKEN, MediaUploadsRepository, [CORE_TOKENS.DB_ADAPTER]),
    classProvider(MEDIA_STORAGE_CONFIG_SERVICE_TOKEN, MediaStorageConfigService, [
      RUNTIME_CONFIG_SERVICE_TOKEN,
      SETTINGS_SERVICE_TOKEN
    ]),
    classProvider(MEDIA_UPLOADS_SERVICE_TOKEN, MediaUploadsService, [
      MEDIA_UPLOADS_REPOSITORY_TOKEN,
      MEDIA_ASSETS_SERVICE_TOKEN,
      MEDIA_PROVIDER_REGISTRY_TOKEN,
      MEDIA_STORAGE_CONFIG_SERVICE_TOKEN,
      MEDIA_DOMAIN_EVENTS_SERVICE_TOKEN
    ]),
    httpProvider(MEDIA_UPLOAD_CONTROLLER_TOKEN, MediaUploadController, [
      MEDIA_UPLOADS_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
      CORE_TOKENS.AUTHZ_SERVICE
    ]),
    httpProvider(MEDIA_ASSETS_CONTROLLER_TOKEN, MediaAssetsController, [
      MEDIA_ASSETS_SERVICE_TOKEN,
      MEDIA_DIRECTORIES_SERVICE_TOKEN,
      MEDIA_PROVIDER_REGISTRY_TOKEN,
      MEDIA_STORAGE_CONFIG_SERVICE_TOKEN,
      CORE_PACK_JWT_AUTH_SERVICE_TOKEN,
      CORE_TOKENS.AUTHZ_SERVICE
    ])
  ],
  exports: [
    MEDIA_ENTITY_REGISTRATION_TOKEN,
    MEDIA_PROVIDER_REGISTRY_TOKEN,
    MEDIA_LOCAL_DISK_PROVIDER_TOKEN,
    MEDIA_PROVIDER_REGISTRY_INITIALIZATION_TOKEN,
    MEDIA_ASSETS_REPOSITORY_TOKEN,
    MEDIA_ASSETS_SERVICE_TOKEN,
    MEDIA_DIRECTORIES_REPOSITORY_TOKEN,
    MEDIA_DIRECTORIES_SERVICE_TOKEN,
    MEDIA_UPLOADS_REPOSITORY_TOKEN,
    MEDIA_UPLOADS_SERVICE_TOKEN,
    MEDIA_STORAGE_CONFIG_SERVICE_TOKEN,
    MEDIA_DOMAIN_EVENTS_SERVICE_TOKEN,
    MEDIA_UPLOAD_CONTROLLER_TOKEN,
    MEDIA_ASSETS_CONTROLLER_TOKEN
  ]
});
