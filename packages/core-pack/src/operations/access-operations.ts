import { createToken } from "@trinacria-cms/kernel";
import type { ApplicationOperations, OperationAuthorizer } from "@trinacria-cms/kernel/contracts";
import { createApplicationOperations } from "@trinacria-cms/kernel/runtime";
import type { PermissionsService } from "../modules/permissions/services/permissions.service.js";
import type { RolesService } from "../modules/roles/services/roles.service.js";
import type { RolePolicyRulesService } from "../modules/security/role-policy-rules/role-policy-rules.service.js";
import type { UserAccessService } from "../modules/security/user-access/user-access.service.js";
import type { UsersService } from "../modules/users/services/users.service.js";
export type UsersOperations = ApplicationOperations<
  Pick<
    UsersService,
    | "createUser"
    | "getUserById"
    | "listUsers"
    | "suspendUser"
    | "activateUser"
    | "updateUserProfile"
  >
>;
export const USERS_OPERATIONS = createToken<UsersOperations>("USERS_OPERATIONS");
export function createUsersOperations(
  service: UsersService,
  authorizer: OperationAuthorizer
): UsersOperations {
  return createApplicationOperations(service, authorizer, {
    createUser: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "users",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    getUserById: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "users",
        action: "read",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    listUsers: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "users",
        action: "read",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    suspendUser: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "users",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    activateUser: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "users",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    updateUserProfile: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "users",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    }
  });
}
export type RolesOperations = ApplicationOperations<
  Pick<
    RolesService,
    "createRole" | "getRoleById" | "listRoles" | "disableRole" | "activateRole" | "updateRole"
  >
>;
export const ROLES_OPERATIONS = createToken<RolesOperations>("ROLES_OPERATIONS");
export function createRolesOperations(
  service: RolesService,
  authorizer: OperationAuthorizer
): RolesOperations {
  return createApplicationOperations(service, authorizer, {
    createRole: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "roles",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    getRoleById: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "roles",
        action: "read",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    listRoles: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "roles",
        action: "read",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    disableRole: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "roles",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    activateRole: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "roles",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    updateRole: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "roles",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    }
  });
}
export type PermissionsOperations = ApplicationOperations<
  Pick<
    PermissionsService,
    | "createPermission"
    | "getPermissionById"
    | "listPermissions"
    | "disablePermission"
    | "activatePermission"
    | "updatePermission"
  >
>;
export const PERMISSIONS_OPERATIONS = createToken<PermissionsOperations>("PERMISSIONS_OPERATIONS");
export function createPermissionsOperations(
  service: PermissionsService,
  authorizer: OperationAuthorizer
): PermissionsOperations {
  return createApplicationOperations(service, authorizer, {
    createPermission: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "permissions",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    getPermissionById: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "permissions",
        action: "read",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    listPermissions: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "permissions",
        action: "read",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    disablePermission: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "permissions",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    activatePermission: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "permissions",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    updatePermission: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "permissions",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    }
  });
}
export type UserAccessOperations = ApplicationOperations<
  Pick<
    UserAccessService,
    "assignRoleToUser" | "removeRoleFromUser" | "listUserRoles" | "resolveUserPermissions"
  >
>;
export const USER_ACCESS_OPERATIONS = createToken<UserAccessOperations>("USER_ACCESS_OPERATIONS");
export function createUserAccessOperations(
  service: UserAccessService,
  authorizer: OperationAuthorizer
): UserAccessOperations {
  return createApplicationOperations(service, authorizer, {
    assignRoleToUser: {
      target: (args) => [
        {
          ownerPluginId: "core-pack",
          resource: "users",
          action: "write",
          ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
        },
        { ownerPluginId: "core-pack", resource: "roles", action: "write" }
      ]
    },
    removeRoleFromUser: {
      target: (args) => [
        {
          ownerPluginId: "core-pack",
          resource: "users",
          action: "write",
          ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
        },
        { ownerPluginId: "core-pack", resource: "roles", action: "write" }
      ]
    },
    listUserRoles: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "users",
        action: "read",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    resolveUserPermissions: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "users",
        action: "read",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    }
  });
}
export type RoleRulesOperations = ApplicationOperations<
  Pick<RolePolicyRulesService, "listByRoleCode" | "create" | "update" | "delete">
>;
export const ROLE_RULES_OPERATIONS = createToken<RoleRulesOperations>("ROLE_RULES_OPERATIONS");
export function createRoleRulesOperations(
  service: RolePolicyRulesService,
  authorizer: OperationAuthorizer
): RoleRulesOperations {
  return createApplicationOperations(service, authorizer, {
    listByRoleCode: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "roles",
        action: "read",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    create: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "roles",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    update: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "roles",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    },
    delete: {
      target: (args) => ({
        ownerPluginId: "core-pack",
        resource: "roles",
        action: "write",
        ...(typeof args[0] === "string" ? { resourceId: args[0] } : {})
      })
    }
  });
}
