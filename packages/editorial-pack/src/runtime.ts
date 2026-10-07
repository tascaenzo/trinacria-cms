// Advanced host composition. Never expose this surface to plugin code through host services.
export * from "./modules/index.js";
export { PublicationsRepository } from "./modules/publications/publications.repository.js";
export {
  PUBLICATION_POINTERS_ENTITY,
  PUBLICATION_SNAPSHOTS_ENTITY
} from "./modules/publications/publications.schemas.js";
export type { ContentTypeOperations } from "./operations/content-type-operations.js";
export { CONTENT_TYPE_OPERATIONS } from "./operations/content-type-operations.js";
export {
  EDITORIAL_ENTRY_OPERATIONS,
  EditorialEntryOperations
} from "./operations/editorial-entry-operations.js";
export * from "./plugin/index.js";
