import { defineModule } from "@trinacria-cms/kernel";
import { CorePackUsersModule } from "./users/users.module.js";
import { CorePackSecurityModule } from "./security/security.module.js";
import { CorePackSettingsModule } from "./settings/settings.module.js";

/**
 * Root module importing all baseline core-pack domains.
 */
export const CorePackRootModule = defineModule({
  name: "CorePackRootModule",
  imports: [
    CorePackUsersModule,
    CorePackSecurityModule,
    CorePackSettingsModule,
  ],
});
