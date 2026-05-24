import { defineModule } from "@trinacria-cms/kernel";
import { CorePackAuthModule } from "./auth/auth.module.js";
import { CorePackCacheModule } from "./cache/cache.module.js";
import { CorePackInstallationModule } from "./installation/installation.module.js";
import { CorePackUsersModule } from "./users/users.module.js";
import { CorePackSecurityModule } from "./security/security.module.js";
import { CorePackSettingsModule } from "./settings/settings.module.js";

/**
 * Root module importing all baseline core-pack domains.
 * Installation endpoints are included to support first-run bootstrap via API.
 */
export const CorePackRootModule = defineModule({
  name: "CorePackRootModule",
  imports: [
    CorePackCacheModule,
    CorePackAuthModule,
    CorePackInstallationModule,
    CorePackUsersModule,
    CorePackSecurityModule,
    CorePackSettingsModule
  ]
});
