import { defineModule } from "@trinacria-cms/kernel";
import { CorePackUsersModule } from "./users/users.module.js";
import { CorePackRolesModule } from "./roles/roles.module.js";
import { CorePackPermissionsModule } from "./permissions/permissions.module.js";
import { CorePackSettingsModule } from "./settings/settings.module.js";

/**
 * Root module importing all baseline core-pack domains.
 */
export const CorePackRootModule = defineModule({
  name: "CorePackRootModule",
  imports: [
    CorePackUsersModule,
    CorePackRolesModule,
    CorePackPermissionsModule,
    CorePackSettingsModule,
  ],
});
