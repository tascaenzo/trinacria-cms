import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
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
    if (!this.cache) {
      return this.getFromDb();
    }
    return this.cache.getOrCompute(CACHE_NAMESPACE, "state", () => this.getFromDb());
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
    const created = await this.repository().insertOne({
      kind: INSTALLATION_STATE_KIND,
      key: INSTALLATION_STATE_KEY,
      installed: false,
      createdAt: now,
      updatedAt: now
    });
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
