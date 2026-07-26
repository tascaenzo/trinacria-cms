import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../plugin/editorial-pack.constants.js";
import { EntryRevisionRecordSchema, type EntryRevisionRecord } from "./revisions.schemas.js";

export class RevisionsRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(revision: EntryRevisionRecord): Promise<EntryRevisionRecord> {
    return EntryRevisionRecordSchema.parse(await this.repository().insertOne(revision));
  }

  async listByEntryId(entryId: string, options: { limit?: number; offset?: number } = {}) {
    return this.repository().findMany({
      filter: { entryId: entryId.trim() },
      limit: options.limit,
      offset: options.offset,
      sort: { revisionNumber: "desc" },
      parse: (value: unknown) => EntryRevisionRecordSchema.parse(value)
    });
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, EDITORIAL_PACK_PLUGIN_ID);
    return this.scope.repository<EntryRevisionRecord>("entry_revisions");
  }
}
