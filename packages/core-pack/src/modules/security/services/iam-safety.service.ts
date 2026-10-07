import { CoreError, type DbAdapter } from "@trinacria-cms/kernel";
import { createPluginDbScope } from "@trinacria-cms/kernel/runtime";
import { PermissionsRepository } from "../../permissions/repositories/permissions.repository.js";
import { RoleGrantsRepository } from "../../roles/grants/role-grants.repository.js";
import { RolesRepository } from "../../roles/repositories/roles.repository.js";
import { UsersRepository } from "../../users/repositories/users.repository.js";
import { isPermissionAllowed } from "../policies/authz-rules.js";
import { RolePolicyRulesRepository } from "../role-policy-rules/role-policy-rules.repository.js";
import { UserAccessService } from "../user-access/user-access.service.js";
import { UserRolesRepository } from "../user-access/user-roles.repository.js";

export function createUserAccessService(db: DbAdapter): UserAccessService {
  return new UserAccessService(
    new UsersRepository(db),
    new RolesRepository(db),
    new RoleGrantsRepository(db),
    new RolePolicyRulesRepository(db),
    new PermissionsRepository(db),
    new UserRolesRepository(db)
  );
}

/** Serialize IAM invariants on the shared installation document, in the same Mongo transaction. */
export class IamSafetyService {
  constructor(private readonly db: DbAdapter) {}

  async mutate<T>(work: (db: DbAdapter) => Promise<T>): Promise<T> {
    if (!this.db.withTransaction) throw new Error("IAM writes require transactional storage");
    return this.db.withTransaction({ pluginId: "core-pack" }, (db) =>
      this.verify(db, () => work(db))
    );
  }

  async verify<T>(db: DbAdapter, work: () => Promise<T>): Promise<T> {
    const scope = createPluginDbScope(db, "core-pack");
    const settings = scope.repository<Record<string, unknown>>("settings");
    const installation = await settings.findOne({
      filter: { kind: "install_state", installed: true }
    });
    if (!installation) return work();
    // The document already exists; writing it prevents snapshot write-skew between distinct users/roles.
    await settings.updateOne(
      { filter: { id: installation.id } },
      {
        updatedAt: new Date(
          Math.max(Date.now(), Date.parse(String(installation.updatedAt)) + 1)
        ).toISOString()
      }
    );
    const result = await work();
    const access = createUserAccessService(db);
    const users = await scope
      .repository<Record<string, unknown>>("users")
      .findMany({ filter: { status: "active" } });
    const credentials = scope.repository<Record<string, unknown>>("local_credentials");
    for (const user of users) {
      const id = String(user.id);
      if (!(await credentials.findOne({ filter: { userId: id } }))) continue;
      const rules = await access.resolveUserAuthorizationRules(id);
      if (
        ["backoffice:access", "users:write", "roles:write", "permissions:write"].every((key) =>
          isPermissionAllowed(rules, `core-pack:${key}`, id)
        )
      )
        return result;
    }
    throw new CoreError(
      "iam_last_admin",
      "At least one active administrator with local credentials must remain"
    );
  }
}
