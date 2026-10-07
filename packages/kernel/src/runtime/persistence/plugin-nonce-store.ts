import { s } from "@trinacria/schema";
import type { PluginNonceStore } from "../../contracts/plugin-nonce-store.js";
import { duplicateKey } from "../migrations/platform-storage.js";
import { defineEntity } from "./entity-registry.js";
import type { MongoDbAdapter } from "./mongo-db-adapter.js";

export const PLUGIN_AUTH_NONCES_ENTITY = defineEntity({
  ownerPluginId: "kernel",
  entityName: "plugin_auth_nonces",
  schema: s.object(
    { pluginId: s.string(), nonceHash: s.string(), expiresAt: s.date() },
    { strict: true }
  ),
  indexes: [
    { fields: { pluginId: 1, nonceHash: 1 }, unique: true, name: "plugin_auth_nonces_identity" },
    { fields: { expiresAt: 1 }, expireAfterSeconds: 0, name: "plugin_auth_nonces_expiry" }
  ]
});
export class MongoPluginNonceStore implements PluginNonceStore {
  readonly shared = true;
  private initialization?: Promise<void>;
  constructor(private readonly adapter: MongoDbAdapter) {}
  async consume(pluginId: string, nonceHash: string, expiresAt: Date): Promise<boolean> {
    if (
      !/^[a-z0-9][a-z0-9._/-]*$/.test(pluginId) ||
      !/^[a-f0-9]{64}$/.test(nonceHash) ||
      !Number.isFinite(expiresAt.getTime())
    )
      throw new Error("Invalid nonce storage tuple");
    this.initialization ??= this.adapter
      .ensureIndexes("kernel", [PLUGIN_AUTH_NONCES_ENTITY.entityName])
      .catch((error) => {
        this.initialization = undefined;
        throw error;
      });
    await this.initialization;
    try {
      await this.adapter
        .repository(PLUGIN_AUTH_NONCES_ENTITY.entityName, { pluginId: "kernel" })
        .insertOne({ pluginId, nonceHash, expiresAt });
      return true;
    } catch (error) {
      if (duplicateKey(error)) return false;
      throw error;
    }
  }
}
/** Explicit dev/test store; full capacity refuses new nonces, never evicts valid entries. */
export class MemoryPluginNonceStore implements PluginNonceStore {
  readonly shared = false;
  private readonly nonces = new Map<string, number>();
  constructor(
    private readonly maxEntries = 10000,
    private readonly now = Date.now
  ) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1)
      throw new Error("Invalid nonce capacity");
  }
  async consume(pluginId: string, nonceHash: string, expiresAt: Date): Promise<boolean> {
    const now = this.now();
    if (
      !/^[a-z0-9][a-z0-9._/-]*$/.test(pluginId) ||
      !/^[a-f0-9]{64}$/.test(nonceHash) ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() <= now
    )
      throw new Error("Invalid nonce storage tuple");
    for (const [key, expiry] of this.nonces) if (expiry <= now) this.nonces.delete(key);
    const key = JSON.stringify([pluginId, nonceHash]);
    if (this.nonces.has(key)) return false;
    if (this.nonces.size >= this.maxEntries) throw new Error("Nonce store capacity reached");
    this.nonces.set(key, expiresAt.getTime());
    return true;
  }
}
