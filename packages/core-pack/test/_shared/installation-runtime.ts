import type { DbAdapter, PluginManifest, InstallationHost } from "@trinacria-cms/kernel";
import { LocalCredentialsRepository } from "../../src/modules/installation/repositories/local-credentials.repository.js";
import { InstallationService } from "../../src/modules/installation/services/installation.service.js";
import { InstallationStateRepository } from "../../src/modules/installation/repositories/installation-state.repository.js";
import { PasswordHashingService } from "../../src/modules/installation/services/password-hashing.service.js";
import { PermissionsRepository } from "../../src/modules/permissions/repositories/permissions.repository.js";
import { RoleGrantsRepository } from "../../src/modules/roles/grants/role-grants.repository.js";
import { RolesRepository } from "../../src/modules/roles/repositories/roles.repository.js";
import { CorePackManifestProvisioningService } from "../../src/modules/security/services/security-provisioning.service.js";
import { RolePolicyRulesRepository } from "../../src/modules/security/role-policy-rules/role-policy-rules.repository.js";
import { UserAccessService } from "../../src/modules/security/user-access/user-access.service.js";
import { UserRolesRepository } from "../../src/modules/security/user-access/user-roles.repository.js";
import { SettingsDefinitionsRepository } from "../../src/modules/settings/definitions/settings-definitions.repository.js";
import { SettingsValuesRepository } from "../../src/modules/settings/values/settings-values.repository.js";
import { SettingsSecretsRepository } from "../../src/modules/settings/secrets/settings-secrets.repository.js";
import { SettingsSecretsCryptoService } from "../../src/modules/settings/secrets/settings-secrets-crypto.service.js";
import { SettingsService } from "../../src/modules/settings/services/settings.service.js";
import { UsersRepository } from "../../src/modules/users/repositories/users.repository.js";

import type { MongoDurableEventStore } from "@trinacria-cms/kernel/runtime";
interface InstallationRuntime {
  service: InstallationService;
  installationState: InstallationStateRepository;
  localCredentials: LocalCredentialsRepository;
  settings: SettingsService;
  roles: RolesRepository;
  userAccess: UserAccessService;
  passwordHashing: PasswordHashingService;
}

export function createInstallationRuntime(
  db: DbAdapter,
  loadedManifest?: PluginManifest,
  host?: InstallationHost,
  durable?: MongoDurableEventStore,
): InstallationRuntime {
  const users = new UsersRepository(db);
  const roles = new RolesRepository(db);
  const roleGrants = new RoleGrantsRepository(db);
  const rolePolicyRules = new RolePolicyRulesRepository(db);
  const permissions = new PermissionsRepository(db);
  const userRoles = new UserRolesRepository(db);
  const settings = new SettingsService(
    new SettingsDefinitionsRepository(db),
    new SettingsValuesRepository(db),
    new SettingsSecretsRepository(db),
    new SettingsSecretsCryptoService(),
  );
  const userAccess = new UserAccessService(
    users,
    roles,
    roleGrants,
    rolePolicyRules,
    permissions,
    userRoles,
  );
  const manifestProvisioning = new CorePackManifestProvisioningService(
    roles,
    roleGrants,
    permissions,
    userRoles,
    settings,
  );
  const installationState = new InstallationStateRepository(db);
  const localCredentials = new LocalCredentialsRepository(db);
  const passwordHashing = new PasswordHashingService();
  if (loadedManifest) manifestProvisioning.defer(loadedManifest);

  return {
    service: new InstallationService(
      installationState,
      localCredentials,
      users,
      userAccess,
      manifestProvisioning,
      passwordHashing,
      settings,
      durable,
      host,
    ),
    installationState,
    localCredentials,
    settings,
    roles,
    userAccess,
    passwordHashing,
  };
}
