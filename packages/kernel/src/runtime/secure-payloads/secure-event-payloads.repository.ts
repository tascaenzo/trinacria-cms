import type { DbAdapter } from "../../contracts/db-adapter.js";
import type { SecureEventPayloadRecord } from "../../contracts/secure-event-payloads.js";
import {
  SECURE_EVENT_PAYLOADS_ENTITY,
  SecureEventPayloadRecordSchema
} from "./secure-event-payloads.schemas.js";

const KERNEL_NAMESPACE_PLUGIN_ID = "kernel";

export class SecureEventPayloadsRepository {
  constructor(private readonly db: DbAdapter) {}

  async create(
    input: Omit<
      SecureEventPayloadRecord,
      "id" | "createdAt" | "updatedAt" | "claimCount" | "status"
    >
  ): Promise<SecureEventPayloadRecord> {
    const now = new Date().toISOString();
    const created = await this.repository().insertOne({
      ...input,
      status: "available",
      claimCount: 0,
      createdAt: now,
      updatedAt: now
    });
    return SecureEventPayloadRecordSchema.parse(created) as SecureEventPayloadRecord;
  }

  async findById(id: string): Promise<SecureEventPayloadRecord | null> {
    return this.repository().findOne({
      filter: { id },
      parse: (value) => SecureEventPayloadRecordSchema.parse(value) as SecureEventPayloadRecord
    });
  }

  async update(
    id: string,
    patch: Partial<Omit<SecureEventPayloadRecord, "id" | "createdAt">>
  ): Promise<SecureEventPayloadRecord | null> {
    const updated = await this.repository().updateOne(
      { filter: { id } },
      {
        ...patch,
        updatedAt: new Date().toISOString()
      }
    );
    return updated
      ? (SecureEventPayloadRecordSchema.parse(updated) as SecureEventPayloadRecord)
      : null;
  }

  private repository() {
    return this.db.repository<SecureEventPayloadRecord>(SECURE_EVENT_PAYLOADS_ENTITY.entityName, {
      pluginId: KERNEL_NAMESPACE_PLUGIN_ID
    });
  }
}
