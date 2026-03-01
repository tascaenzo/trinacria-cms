import type {
  SettingsQuery,
  SettingsRecord,
  SettingsService,
  SettingsStore
} from "../contracts/settings";

export class DefaultSettingsService implements SettingsService {
  constructor(private readonly store: SettingsStore) {}

  async get(query: SettingsQuery): Promise<SettingsRecord["value"] | null> {
    const records = await Promise.all([
      this.store.get({ ...query, scope: "user" }),
      this.store.get({ ...query, scope: "plugin" }),
      this.store.get({ ...query, scope: "workspace" }),
      this.store.get({ ...query, scope: "global" })
    ]);

    const resolved = records.find((record) => record !== null);
    return resolved?.value ?? null;
  }

  async set(
    query: SettingsQuery,
    value: SettingsRecord["value"],
    options?: { expectedVersion?: number; updatedBy?: string }
  ): Promise<SettingsRecord> {
    return this.store.set(query, value, options);
  }

  async delete(query: SettingsQuery): Promise<void> {
    return this.store.delete(query);
  }
}
