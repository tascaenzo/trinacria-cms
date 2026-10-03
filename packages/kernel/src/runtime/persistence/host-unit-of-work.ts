import type { DbRepository } from "../../contracts/db-adapter.js";
import type { NamespaceContext } from "../../contracts/namespace-context.js";
import type { MongoDbAdapter } from "./mongo-db-adapter.js";

export interface HostTransactionRepositories {
  repository<T = unknown>(entityName: string, namespace: NamespaceContext): DbRepository<T>;
}
/** Host infrastructure only. Do not expose this object through PluginHostServices. */
export class HostUnitOfWork {
  constructor(private readonly adapter: MongoDbAdapter) {}
  run<T>(
    allowedNamespaces: readonly NamespaceContext[],
    work: (repositories: HostTransactionRepositories) => Promise<T>,
    options?: { bypassMaintenance?: boolean }
  ): Promise<T> {
    return this.adapter.runHostTransaction(allowedNamespaces, work, options);
  }
}
