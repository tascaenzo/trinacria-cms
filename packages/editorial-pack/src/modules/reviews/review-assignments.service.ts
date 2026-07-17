import { EntriesRepository } from "../entries/repositories/entries.repository.js";
import { ReviewAssignmentsRepository } from "./review-assignments.repository.js";

export class ReviewAssignmentsService {
  constructor(
    private readonly reviews: ReviewAssignmentsRepository,
    private readonly entries: EntriesRepository
  ) {}
  async assign(input: { entryId: string; assigneeUserId: string; assignedByUserId: string }) {
    const entry = await this.entries.findById(input.entryId);
    if (!entry) return null;
    if (!["draft", "in_review"].includes(entry.status)) {
      throw new Error("Reviewers can only be assigned to drafts or entries in review");
    }
    return this.reviews.assign(input);
  }
  async list(entryId: string) {
    return this.reviews.list(entryId);
  }
}
