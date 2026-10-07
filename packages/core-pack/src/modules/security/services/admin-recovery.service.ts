import { CoreError, type DbAdapter, s } from "@trinacria-cms/kernel";
import { createPluginDbScope } from "@trinacria-cms/kernel/runtime";
import { CORE_PACK_PERMISSION_KEY_LIST } from "../../../plugin/core-pack.security.js";
import { AuthMfaRepository } from "../../auth/repositories/auth-mfa.repository.js";
import { AuthUsersRepository } from "../../auth/repositories/auth-users.repository.js";
import { LocalCredentialsRepository } from "../../installation/repositories/local-credentials.repository.js";
import { PasswordHashingService } from "../../installation/services/password-hashing.service.js";
import { PermissionsRepository } from "../../permissions/repositories/permissions.repository.js";
import { RoleGrantsRepository } from "../../roles/grants/role-grants.repository.js";
import { RolesRepository } from "../../roles/repositories/roles.repository.js";
import { IamSafetyService } from "./iam-safety.service.js";

/** Local host recovery only. Deliberately absent from HTTP and plugin operations. */
export async function recoverAdministrator(
  db: DbAdapter,
  input: { email: string; password: string; resetMfa?: boolean }
) {
  const email = s.string({ trim: true, toLowerCase: true, email: true }).parse(input.email);
  s.string({ minLength: 12, maxLength: 200 }).parse(input.password);
  const password = await new PasswordHashingService().hashPassword(input.password);
  return new IamSafetyService(db).mutate(async (transaction) => {
    const scope = createPluginDbScope(transaction, "core-pack");
    const users = new AuthUsersRepository(transaction);
    const user = await users.findByEmail(email);
    if (!user) throw new CoreError("not_found", "Recovery requires an existing account");
    const installation = await scope
      .repository<Record<string, unknown>>("settings")
      .findOne({ filter: { kind: "install_state", installed: true } });
    if (!installation)
      throw new CoreError("invalid_request", "Complete installation before recovering an account");
    const roles = new RolesRepository(transaction);
    const role = await roles.upsertOwnedRole({
      code: "admin",
      name: "Administrator",
      ownerPluginId: "core-pack"
    });
    await roles.rawUpdate(role.id, { status: "active", policyRules: [] });
    const permissions = new PermissionsRepository(transaction);
    const grants = new RoleGrantsRepository(transaction);
    for (const key of CORE_PACK_PERMISSION_KEY_LIST) {
      const permission = await permissions.findByKey(key);
      if (!permission)
        throw new CoreError(
          "invalid_request",
          "Core permission catalog is incomplete; start the CMS to provision it first"
        );
      if (permission.status !== "active")
        await permissions.updateStatus(permission.id, { status: "active" });
      await grants.upsert({ roleCode: "admin", permissionKey: key, sourcePluginId: "core-pack" });
    }
    const now = new Date().toISOString();
    await scope.repository<Record<string, unknown>>("users").updateOne(
      { filter: { id: user.id } },
      {
        status: "active",
        sessionVersion: (user.sessionVersion ?? 0) + 1,
        updatedAt: now,
        roleAssignments: [
          { roleCode: "admin", sourcePluginId: "core-pack", createdAt: now, updatedAt: now }
        ]
      }
    );
    await new LocalCredentialsRepository(transaction).upsert({ userId: user.id, ...password });
    // Pending login challenges and account-flow links must not survive local recovery.
    for (const entity of ["auth_mfa_challenges", "auth_flow_tokens"]) {
      const repository = scope.repository<Record<string, unknown>>(entity);
      for (const item of await repository.findMany({ filter: { userId: user.id } }))
        await repository.deleteOne({ filter: { id: item.id } });
    }
    if (input.resetMfa) await new AuthMfaRepository(transaction).disable(user.id);
    return { userId: user.id, email, resetMfa: Boolean(input.resetMfa) };
  });
}
