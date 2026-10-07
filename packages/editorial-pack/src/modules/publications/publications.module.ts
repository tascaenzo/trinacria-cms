import {
  CorePackSecurityModule,
  CorePackSettingsModule,
  SETTINGS_SERVICE_TOKEN
} from "@trinacria-cms/core-pack/runtime";
import {
  CORE_TOKENS,
  createToken,
  defineModule,
  factoryProvider,
  httpProvider,
  type ModuleDefinition
} from "@trinacria-cms/kernel";
import type { EntityRegistry, PublicRequestLimiter } from "@trinacria-cms/kernel/runtime";
import {
  MEDIA_ASSETS_SERVICE_TOKEN,
  MediaPackMediaModule
} from "@trinacria-cms/media-pack/runtime";
import { ContentTypesRepository } from "../content-types/repositories/content-types.repository.js";
import { EditorialDeliveryController } from "./delivery.controller.js";
import { EditorialDeliveryService } from "./delivery.service.js";
import {
  DELIVERY_CACHE_ENTITY,
  DELIVERY_CACHE_EPOCHS_ENTITY,
  SharedDeliveryCache
} from "./delivery-cache.js";
import { PUBLIC_NAVIGATION_SETTING } from "./navigation.js";
import { PublicationsRepository } from "./publications.repository.js";

export const EDITORIAL_DELIVERY_SERVICE =
  createToken<EditorialDeliveryService>("EDITORIAL_DELIVERY");
const rate = createToken<Pick<PublicRequestLimiter, "consume">>("EDITORIAL_DELIVERY_RATE");
const controller = createToken<EditorialDeliveryController>("EDITORIAL_DELIVERY_HTTP");
const registration = createToken<boolean>("EDITORIAL_DELIVERY_CACHE_ENTITIES");
export const EditorialPublicationsModule: ModuleDefinition = defineModule({
  name: "EditorialPublicationsModule",
  imports: [CorePackSecurityModule, CorePackSettingsModule, MediaPackMediaModule],
  providers: [
    factoryProvider(
      registration,
      (registry) => {
        for (const entity of [DELIVERY_CACHE_ENTITY, DELIVERY_CACHE_EPOCHS_ENTITY])
          (registry as EntityRegistry).register(entity);
        return true;
      },
      [CORE_TOKENS.ENTITY_REGISTRY]
    ),
    factoryProvider(
      EDITORIAL_DELIVERY_SERVICE,
      (db, media, authorizer, settings) =>
        new EditorialDeliveryService(
          new PublicationsRepository(db),
          new ContentTypesRepository(db),
          media,
          authorizer,
          async () =>
            (await settings.getResolvedValueForPlugin("editorial-pack", PUBLIC_NAVIGATION_SETTING))
              ?.value ?? [],
          new SharedDeliveryCache(db)
        ),
      [
        CORE_TOKENS.DB_ADAPTER,
        MEDIA_ASSETS_SERVICE_TOKEN,
        CORE_TOKENS.OPERATION_AUTHORIZER,
        SETTINGS_SERVICE_TOKEN
      ]
    ),
    factoryProvider(rate, (limiter) => limiter, [CORE_TOKENS.PUBLIC_REQUEST_LIMITER]),
    httpProvider(controller, EditorialDeliveryController, [EDITORIAL_DELIVERY_SERVICE, rate])
  ],
  exports: [controller, EDITORIAL_DELIVERY_SERVICE, registration]
});
