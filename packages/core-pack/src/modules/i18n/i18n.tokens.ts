import { createToken } from "@trinacria-cms/kernel";
import { I18nBundlesRepository } from "./i18n-bundles.repository.js";
import { I18nBundlesService } from "./i18n-bundles.service.js";
import { I18nController } from "./i18n.controller.js";

export const I18N_BUNDLES_ENTITY_REGISTRATION_TOKEN = createToken<boolean>("I18N_BUNDLES_ENTITY");
export const I18N_BUNDLES_REPOSITORY_TOKEN = createToken<I18nBundlesRepository>("I18N_BUNDLES_REPOSITORY");
export const I18N_BUNDLES_SERVICE_TOKEN = createToken<I18nBundlesService>("I18N_BUNDLES_SERVICE");
export const I18N_CONTROLLER_TOKEN = createToken<I18nController>("I18N_CONTROLLER");
