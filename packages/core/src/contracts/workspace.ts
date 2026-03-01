export interface Workspace {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}

export interface WorkspaceContext {
  workspaceId: string;
  pluginId?: string;
  userId?: string;
}

export interface WorkspaceResolver {
  resolve(input?: Partial<WorkspaceContext>): Promise<WorkspaceContext>;
}
