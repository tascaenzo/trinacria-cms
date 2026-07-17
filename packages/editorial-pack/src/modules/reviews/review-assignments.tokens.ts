import { createToken } from "@trinacria-cms/kernel";
import type { ReviewAssignmentsRepository } from "./review-assignments.repository.js";
import type { ReviewAssignmentsService } from "./review-assignments.service.js";
export const REVIEW_ASSIGNMENTS_REPOSITORY_TOKEN = createToken<ReviewAssignmentsRepository>(
  "EDITORIAL_PACK_REVIEW_ASSIGNMENTS_REPOSITORY"
);
export const REVIEW_ASSIGNMENTS_SERVICE_TOKEN = createToken<ReviewAssignmentsService>(
  "EDITORIAL_PACK_REVIEW_ASSIGNMENTS_SERVICE"
);
export const REVIEW_ASSIGNMENTS_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "EDITORIAL_PACK_REVIEW_ASSIGNMENTS_ENTITY_REGISTRATION"
);
