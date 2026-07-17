import { randomUUID } from "node:crypto";
import { createPluginDbScope, type DbAdapter, type PluginDbScope } from "@trinacria-cms/kernel";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../plugin/editorial-pack.constants.js";
import {
  ReviewAssignmentRecordSchema,
  type ReviewAssignmentRecord
} from "./review-assignments.schemas.js";

export class ReviewAssignmentsRepository {
  private scope?: PluginDbScope;
  constructor(private readonly db: DbAdapter) {}
  async assign(input: { entryId: string; assigneeUserId: string; assignedByUserId: string }) {
    const now = new Date().toISOString();
    const record = await this.repository().insertOne({
      id: randomUUID(),
      entryId: input.entryId.trim(),
      assigneeUserId: input.assigneeUserId.trim(),
      assignedByUserId: input.assignedByUserId.trim(),
      status: "assigned" as const,
      createdAt: now,
      updatedAt: now
    });
    return ReviewAssignmentRecordSchema.parse(record);
  }
  async list(entryId: string): Promise<readonly ReviewAssignmentRecord[]> {
    return this.repository().findMany({
      filter: { entryId: entryId.trim() },
      sort: { updatedAt: "desc" },
      parse: (value: unknown) => ReviewAssignmentRecordSchema.parse(value)
    });
  }
  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, EDITORIAL_PACK_PLUGIN_ID);
    return this.scope.repository<ReviewAssignmentRecord>("review_assignments");
  }
}
