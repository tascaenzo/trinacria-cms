export { RevisionsRepository } from "../revisions/revisions.repository.js";
export { REVISIONS_REPOSITORY_TOKEN } from "../revisions/revisions.tokens.js";
export { EntriesController } from "./entries.controller.js";
export type { CreateEntryInput, UpdateEntryInput } from "./entries.input.js";
export { EditorialEntriesModule } from "./entries.module.js";
export type { EntryRecord } from "./entries.schemas.js";
export { ENTRIES_ENTITY, EntryRecordSchema, EntryStatusSchema } from "./entries.schemas.js";
export {
  ENTRIES_CONTROLLER_TOKEN,
  ENTRIES_ENTITY_REGISTRATION_TOKEN,
  ENTRIES_REPOSITORY_TOKEN,
  ENTRIES_SERVICE_TOKEN
} from "./entries.tokens.js";
export { EntriesRepository } from "./repositories/entries.repository.js";
export {
  EntriesService,
  EntryAccessError,
  EntryValidationError
} from "./services/entries.service.js";
