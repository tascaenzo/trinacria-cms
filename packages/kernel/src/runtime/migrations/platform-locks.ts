import type { DbAdapter, DbRepository } from "../../contracts/db-adapter.js";
import type { HostTransactionRepositories } from "../persistence/host-unit-of-work.js";
import { duplicateKey, KERNEL_NAMESPACE } from "./platform-storage.js";

export interface PlatformLease {
  id: string;
  ownerInstanceId: string;
  epoch: number;
}
interface LockRecord extends PlatformLease {
  leaseUntil: Date;
  heartbeat: Date;
  fenceRevision: number;
}
export class PlatformLeaseLostError extends Error {
  readonly code = "platform_lease_lost";
}
export class PlatformLocks {
  private readonly repository: DbRepository<LockRecord>;
  constructor(
    adapter: DbAdapter,
    private readonly now: () => number = Date.now
  ) {
    this.repository = adapter.repository("platform_locks", KERNEL_NAMESPACE);
  }
  async acquire(
    id: string,
    ownerInstanceId: string,
    leaseMs = 30000
  ): Promise<PlatformLease | null> {
    if (!id || !ownerInstanceId || !Number.isSafeInteger(leaseMs) || leaseMs < 1)
      throw new Error("Invalid lease parameters");
    for (let attempt = 0; attempt < 8; attempt++) {
      const now = this.now();
      const existing = await this.repository.findOne({ filter: { id } });
      if (!existing) {
        try {
          await this.repository.insertOne({
            id,
            ownerInstanceId,
            epoch: 1,
            leaseUntil: new Date(now + leaseMs),
            heartbeat: new Date(now),
            fenceRevision: 0
          });
          return { id, ownerInstanceId, epoch: 1 };
        } catch (error) {
          if (!duplicateKey(error)) throw error;
          continue;
        }
      }
      if (existing.leaseUntil.getTime() > now) return null;
      const epoch = existing.epoch + 1;
      const acquired = await this.repository.updateOne(
        { filter: { id, epoch: existing.epoch, leaseUntil: { $lte: new Date(now) } } },
        { ownerInstanceId, epoch, leaseUntil: new Date(now + leaseMs), heartbeat: new Date(now) }
      );
      if (acquired) return { id, ownerInstanceId, epoch };
    }
    return null;
  }
  async renew(lease: PlatformLease, leaseMs = 30000): Promise<void> {
    const now = this.now();
    const record = await this.repository.updateOne(
      { filter: { ...lease, leaseUntil: { $gt: new Date(now) } } },
      { leaseUntil: new Date(now + leaseMs), heartbeat: new Date(now) }
    );
    if (!record) throw new PlatformLeaseLostError("Cannot renew an expired/replaced lease");
  }
  async release(lease: PlatformLease): Promise<void> {
    await this.repository.updateOne({ filter: { ...lease } }, { leaseUntil: new Date(0) });
  }
  async isActive(lease: PlatformLease): Promise<boolean> {
    return !!(await this.repository.findOne({
      filter: { ...lease, leaseUntil: { $gt: new Date(this.now()) } }
    }));
  }
  /** Write the lock in the SAME transaction as data/checkpoint, causing takeover conflicts. */
  async fence(repositories: HostTransactionRepositories, lease: PlatformLease): Promise<void> {
    const repository = repositories.repository<LockRecord>("platform_locks", KERNEL_NAMESPACE);
    const filter = { ...lease, leaseUntil: { $gt: new Date(this.now()) } };
    const current = await repository.findOne({ filter });
    if (
      !current ||
      !(await repository.updateOne(
        { filter: { ...filter, fenceRevision: current.fenceRevision } },
        { fenceRevision: current.fenceRevision + 1 }
      ))
    )
      throw new PlatformLeaseLostError("Migration lease was lost; stale runner cannot commit");
  }
}
