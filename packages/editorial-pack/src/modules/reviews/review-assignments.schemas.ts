import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

export const ReviewAssignmentStatusSchema = s.enum(["assigned", "accepted", "closed"] as const);
export const ReviewAssignmentRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    entryId: s.string({ trim: true, minLength: 1 }),
    assigneeUserId: s.string({ trim: true, minLength: 1 }),
    assignedByUserId: s.string({ trim: true, minLength: 1 }),
    status: ReviewAssignmentStatusSchema,
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);
export type ReviewAssignmentRecord = Infer<typeof ReviewAssignmentRecordSchema>;
export const REVIEW_ASSIGNMENTS_ENTITY = defineEntity({
  entityName: "review_assignments",
  schema: ReviewAssignmentRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "review_assignments_id_unique" },
    { fields: { entryId: 1, status: 1 }, name: "review_assignments_entry_status_idx" },
    { fields: { assigneeUserId: 1, status: 1 }, name: "review_assignments_assignee_status_idx" }
  ] as const
});
