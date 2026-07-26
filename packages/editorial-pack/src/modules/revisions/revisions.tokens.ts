import { createToken } from "@trinacria-cms/kernel";
import type { RevisionsRepository } from "./revisions.repository.js";

export const REVISIONS_REPOSITORY_TOKEN = createToken<RevisionsRepository>(
  "EDITORIAL_PACK_REVISIONS_REPOSITORY"
);
