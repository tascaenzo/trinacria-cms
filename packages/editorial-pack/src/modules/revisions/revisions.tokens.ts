import { createToken } from "@trinacria-cms/kernel";
import type { EntryRevisionsRepository } from "./repositories/entry-revisions.repository.js";

export const ENTRY_REVISIONS_REPOSITORY_TOKEN = createToken<EntryRevisionsRepository>(
  "EDITORIAL_PACK_ENTRY_REVISIONS_REPOSITORY"
);
export const ENTRY_REVISIONS_ENTITY_REGISTRATION_TOKEN = createToken<boolean>(
  "EDITORIAL_PACK_ENTRY_REVISIONS_ENTITY_REGISTRATION"
);
