import type { DbAdapter } from "../../contracts/db-adapter.js";
import type { NamespaceContext } from "../../contracts/namespace-context.js";
import type {
  HostTransactionRepositories,
  HostUnitOfWork
} from "../persistence/host-unit-of-work.js";
import { duplicateKey, KERNEL_NAMESPACE } from "./platform-storage.js";

interface WriterFence {
  id: string;
  maintenance: boolean;
  epoch: number;
  revision: number;
  changedBy: string;
}
export class PlatformMaintenanceError extends Error {
  readonly code = "platform_maintenance";
  readonly statusCode = 503;
}
export class PlatformMaintenance {
  constructor(
    private readonly adapter: DbAdapter,
    private readonly uow: HostUnitOfWork
  ) {}
  async initializeOwner(namespace: NamespaceContext): Promise<void> {
    const id = JSON.stringify([namespace.pluginId, namespace.workspaceId ?? ""]);
    try {
      await this.adapter
        .repository<WriterFence>("platform_writer_fences", KERNEL_NAMESPACE)
        .insertOne({ id, maintenance: false, epoch: 0, revision: 0, changedBy: "bootstrap" });
    } catch (error) {
      if (!duplicateKey(error)) throw error;
    }
  }
  async set(
    namespaces: readonly NamespaceContext[],
    enabled: boolean,
    actorId: string
  ): Promise<void> {
    if (!namespaces.length || !actorId.trim())
      throw new Error("Maintenance owner list and actor required");
    for (const namespace of namespaces) await this.initializeOwner(namespace);
    await this.uow.run(
      [KERNEL_NAMESPACE],
      async (repositories) => {
        const repository = repositories.repository<WriterFence>(
          "platform_writer_fences",
          KERNEL_NAMESPACE
        );
        for (const namespace of namespaces) {
          const id = JSON.stringify([namespace.pluginId, namespace.workspaceId ?? ""]);
          const current = await repository.findOne({ filter: { id } });
          if (!current) throw new Error("Writer fence missing");
          if (
            !(await repository.updateOne(
              { filter: { id, revision: current.revision } },
              {
                maintenance: enabled,
                epoch: current.epoch + 1,
                revision: current.revision + 1,
                changedBy: actorId
              }
            ))
          )
            throw new PlatformMaintenanceError("Concurrent maintenance change");
        }
      },
      { bypassMaintenance: true }
    );
  }
  async assertActive(namespace: NamespaceContext): Promise<void> {
    const id = JSON.stringify([namespace.pluginId, namespace.workspaceId ?? ""]);
    const record = await this.adapter
      .repository<WriterFence>("platform_writer_fences", KERNEL_NAMESPACE)
      .findOne({ filter: { id } });
    if (!record?.maintenance) throw new PlatformMaintenanceError("Migrations require maintenance");
  }
  async fenceActive(
    repositories: HostTransactionRepositories,
    namespace: NamespaceContext
  ): Promise<void> {
    const repository = repositories.repository<WriterFence>(
      "platform_writer_fences",
      KERNEL_NAMESPACE
    );
    const id = JSON.stringify([namespace.pluginId, namespace.workspaceId ?? ""]);
    const record = await repository.findOne({ filter: { id, maintenance: true } });
    if (
      !record ||
      !(await repository.updateOne(
        { filter: { id, maintenance: true, epoch: record.epoch, revision: record.revision } },
        { revision: record.revision + 1 }
      ))
    )
      throw new PlatformMaintenanceError("Migration maintenance fence changed");
  }
  async fence(
    repositories: HostTransactionRepositories,
    namespaces: readonly NamespaceContext[]
  ): Promise<void> {
    const repository = repositories.repository<WriterFence>(
      "platform_writer_fences",
      KERNEL_NAMESPACE
    );
    for (const namespace of namespaces.filter((namespace) => namespace.pluginId !== "kernel")) {
      const id = JSON.stringify([namespace.pluginId, namespace.workspaceId ?? ""]);
      const record = await repository.findOne({ filter: { id } });
      if (!record) throw new PlatformMaintenanceError("Writer owner is not initialized");
      if (
        record.maintenance ||
        !(await repository.updateOne(
          { filter: { id, epoch: record.epoch, revision: record.revision, maintenance: false } },
          { revision: record.revision + 1 }
        ))
      )
        throw new PlatformMaintenanceError("Writes paused for maintenance");
    }
  }
}
