import type { WorkspaceContext } from "./workspace";

export interface Principal {
  id: string;
  type: "user" | "service";
  roles: string[];
  claims?: Record<string, unknown>;
}

export interface AuthResult {
  principal: Principal;
  workspace: WorkspaceContext;
}

export interface AuthProvider {
  authenticate(input: unknown): Promise<AuthResult | null>;
}
