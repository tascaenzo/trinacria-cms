import type { Principal } from "./auth";
import type { WorkspaceContext } from "./workspace";

export interface Permission {
  action: string;
  resource: string;
}

export interface RoleDefinition {
  id: string;
  permissions: Permission[];
}

export interface PermissionCheck {
  action: string;
  resource: string;
  workspace: WorkspaceContext;
}

export interface RbacService {
  hasPermission(principal: Principal, check: PermissionCheck): Promise<boolean>;
}
