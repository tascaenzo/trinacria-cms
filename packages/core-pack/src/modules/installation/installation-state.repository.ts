import {
  createPluginDbScope,
  type DbAdapter,
  type PluginDbScope,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import {
  INSTALLATION_STATE_KEY,
  InstallationStateRecordSchema,
  type InstallationStateRecord,
} from "./installation.schemas.js";

const INSTALLATION_STATE_ENTITY_NAME = "installation_state";

/**
 * Persistence adapter for singleton installation state.
 */
export class InstallationStateRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async get(): Promise<InstallationStateRecord | null> {
    return this.repository().findOne({
      filter: { key: INSTALLATION_STATE_KEY },
      parse: (value: unknown) => InstallationStateRecordSchema.parse(value),
    });
  }

  async ensureCreated(): Promise<InstallationStateRecord> {
    const existing = await this.get();
    if (existing) return existing;

    const now = new Date().toISOString();
    const created = await this.repository().insertOne({
      key: INSTALLATION_STATE_KEY,
      installed: false,
      createdAt: now,
      updatedAt: now,
    });
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
        updatedAt: now,
      },
    );
    if (!updated) {
      throw new Error("Installation state disappeared during update");
    }
    return InstallationStateRecordSchema.parse(updated);
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, CORE_PACK_PLUGIN_ID);
    return this.scope.repository<InstallationStateRecord>(
      INSTALLATION_STATE_ENTITY_NAME,
    );
  }
}

