import { randomUUID } from "node:crypto";
import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../../plugin/editorial-pack.constants.js";
import { EntryRevisionRecordSchema, type EntryRevisionRecord } from "../revisions.schemas.js";

const ENTRY_REVISIONS_ENTITY_NAME = "entry_revisions";

export class EntryRevisionsRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(input: {
    entryId: string;
    reason: string;
    snapshotJson: string;
    createdByUserId: string;
  }): Promise<EntryRevisionRecord> {
    const revisions = await this.listByEntryId(input.entryId);
    const record = await this.repository().insertOne({
      id: randomUUID(),
      entryId: input.entryId.trim(),
      revisionNumber: revisions.length + 1,
      reason: input.reason.trim(),
      snapshotJson: input.snapshotJson,
      createdByUserId: input.createdByUserId.trim(),
      createdAt: new Date().toISOString()
    });
    return EntryRevisionRecordSchema.parse(record);
  }

  async listByEntryId(entryId: string): Promise<readonly EntryRevisionRecord[]> {
    return this.repository().findMany({
      filter: { entryId: entryId.trim() },
      sort: { revisionNumber: "desc" },
      parse: (value: unknown) => EntryRevisionRecordSchema.parse(value)
    });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, EDITORIAL_PACK_PLUGIN_ID);
    return this.scope.repository<EntryRevisionRecord>(ENTRY_REVISIONS_ENTITY_NAME);
  }
}
