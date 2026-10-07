import type { DbAdapter } from "@trinacria-cms/kernel";
import { createPluginDbScope, type PluginDbScope } from "@trinacria-cms/kernel/runtime";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import type { CacheService } from "../../cache/services/cache.service.js";
import {
  INSTALLATION_STATE_KEY,
  type InstallationStateRecord,
  InstallationStateRecordSchema
} from "../installation.schemas.js";

const SETTINGS_ENTITY_NAME = "settings";
const INSTALLATION_STATE_KIND = "install_state";
const CACHE_NAMESPACE = "installation";

export class InstallationStateRepository {
  private scope?: PluginDbScope;

  constructor(
    private readonly db: DbAdapter,
    private readonly cache?: CacheService
  ) {}

  async get(): Promise<InstallationStateRecord | null> {
    // Installation is a shared control record. Read Mongo, never a per-process cache.
    return this.getFromDb();
  }

  getAdapter(): DbAdapter {
    return this.db;
  }

  async checkpoint(input: {
    phase: "configuration" | "content" | "verification" | "complete";
    dataMode?: "empty" | "demo";
    adminEmail?: string;
    adminUserId?: string;
  }): Promise<InstallationStateRecord> {
    const current = await this.ensureCreated();
    const updated = await this.repository().updateOne(
      { filter: { id: current.id, installed: false } },
      { ...input, updatedAt: new Date().toISOString() }
    );
    if (!updated) throw new Error("Installation checkpoint could not be written");
    await this.cache?.invalidate(CACHE_NAMESPACE);
    return InstallationStateRecordSchema.parse(updated);
  }

  private async getFromDb(): Promise<InstallationStateRecord | null> {
    return this.repository().findOne({
      filter: { kind: INSTALLATION_STATE_KIND, key: INSTALLATION_STATE_KEY },
      parse: (value: unknown) => InstallationStateRecordSchema.parse(value)
    });
  }

  async ensureCreated(): Promise<InstallationStateRecord> {
    const existing = await this.get();
    if (existing) return existing;

    const now = new Date().toISOString();
    let created: unknown;
    try {
      created = await this.repository().insertOne({
        kind: INSTALLATION_STATE_KIND,
        key: INSTALLATION_STATE_KEY,
        installed: false,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      const concurrent = await this.get();
      if (concurrent) return concurrent;
      throw error;
    }
    await this.cache?.invalidate(CACHE_NAMESPACE);
    return InstallationStateRecordSchema.parse(created);
  }

  async markInstalled(adminUserId: string): Promise<InstallationStateRecord> {
    const current = await this.ensureCreated();
    const now = new Date().toISOString();
    const updated = await this.repository().updateOne(
      { filter: { id: current.id } },
      {
        installed: true,
        phase: "complete",
        installedAt: now,
        adminUserId: adminUserId.trim(),
        updatedAt: now
      }
    );
    if (!updated) {
      throw new Error("Installation state disappeared during update");
    }
    await this.cache?.invalidate(CACHE_NAMESPACE);
    return InstallationStateRecordSchema.parse(updated);
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<InstallationStateRecord>(SETTINGS_ENTITY_NAME);
  }
}
