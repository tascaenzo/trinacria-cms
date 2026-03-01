import {
  CORE_TOKENS,
  type AuthProvider,
  type CmsPlugin,
  type PermissionCheck,
  type Principal,
  type RbacService,
  type SettingsQuery,
  type SettingsRecord,
  type SettingsStore,
  type WorkspaceContext,
  type WorkspaceResolver
} from "@trinacria-cms/core";

const DEFAULT_WORKSPACE_ID = "default";

type SettingsIndexKey = string;

function keyFromQuery(query: SettingsQuery): SettingsIndexKey {
  return [
    query.scope ?? "workspace",
    query.workspaceId ?? "",
    query.pluginId ?? "",
    query.userId ?? "",
    query.namespace,
    query.key
  ].join("::");
}

class InMemorySettingsStore implements SettingsStore {
  private readonly values = new Map<SettingsIndexKey, SettingsRecord>();

  async get(query: SettingsQuery): Promise<SettingsRecord | null> {
    return this.values.get(keyFromQuery(query)) ?? null;
  }

  async set(
    query: SettingsQuery,
    value: SettingsRecord["value"],
    options?: { expectedVersion?: number; updatedBy?: string }
  ): Promise<SettingsRecord> {
    const now = new Date().toISOString();
    const idx = keyFromQuery(query);
    const prev = this.values.get(idx);

    if (
      typeof options?.expectedVersion === "number" &&
      prev &&
      prev.version !== options.expectedVersion
    ) {
      throw new Error("Settings version mismatch");
    }

    const record: SettingsRecord = {
      scope: query.scope ?? "workspace",
      workspaceId: query.workspaceId,
      pluginId: query.pluginId,
      userId: query.userId,
      namespace: query.namespace,
      key: query.key,
      value,
      version: (prev?.version ?? 0) + 1,
      updatedAt: now,
      updatedBy: options?.updatedBy
    };

    this.values.set(idx, record);
    return record;
  }

  async delete(query: SettingsQuery): Promise<void> {
    this.values.delete(keyFromQuery(query));
  }

  async list(
    query: Pick<SettingsQuery, "namespace"> & Partial<WorkspaceContext>
  ): Promise<SettingsRecord[]> {
    return [...this.values.values()].filter((value) => {
      if (value.namespace !== query.namespace) {
        return false;
      }

      if (query.workspaceId && value.workspaceId !== query.workspaceId) {
        return false;
      }

      if (query.pluginId && value.pluginId !== query.pluginId) {
        return false;
      }

      if (query.userId && value.userId !== query.userId) {
        return false;
      }

      return true;
    });
  }
}

class DefaultWorkspaceResolver implements WorkspaceResolver {
  async resolve(input?: Partial<WorkspaceContext>): Promise<WorkspaceContext> {
    return {
      workspaceId: input?.workspaceId ?? DEFAULT_WORKSPACE_ID,
      pluginId: input?.pluginId,
      userId: input?.userId
    };
  }
}

class AllowAllAuthProvider implements AuthProvider {
  async authenticate(): Promise<{ principal: Principal; workspace: WorkspaceContext }> {
    return {
      principal: {
        id: "system-admin",
        type: "user",
        roles: ["admin"]
      },
      workspace: {
        workspaceId: DEFAULT_WORKSPACE_ID,
        userId: "system-admin"
      }
    };
  }
}

class RoleBasedRbacService implements RbacService {
  async hasPermission(principal: Principal, _check: PermissionCheck): Promise<boolean> {
    return principal.roles.includes("admin");
  }
}

export function createCorePackPlugin(): CmsPlugin {
  return {
    manifest: {
      id: "core-pack",
      version: "0.1.0"
    },
    async register(ctx) {
      ctx.registerProvider({
        token: CORE_TOKENS.settingsStore,
        value: new InMemorySettingsStore()
      });

      ctx.registerProvider({
        token: CORE_TOKENS.workspaceResolver,
        value: new DefaultWorkspaceResolver()
      });

      ctx.registerProvider({
        token: CORE_TOKENS.auth,
        value: new AllowAllAuthProvider()
      });

      ctx.registerProvider({
        token: CORE_TOKENS.rbac,
        value: new RoleBasedRbacService()
      });
    }
  };
}
