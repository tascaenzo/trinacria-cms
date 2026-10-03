import { createToken, s } from "@trinacria-cms/kernel";
import type { PluginOperationsProvider } from "@trinacria-cms/kernel/plugin-api";
import { pluginOperationsProvider } from "@trinacria-cms/kernel/runtime";
import { CONTENT_TYPES_SERVICE_TOKEN } from "../modules/content-types/content-types.tokens.js";
import type { ContentTypesService } from "../modules/content-types/services/content-types.service.js";
import type { CreateEntryInput, UpdateEntryInput } from "../modules/entries/entries.input.js";
import {
  CreateEntryInputSchema,
  UpdateEntryInputSchema
} from "../modules/entries/entries.input.js";
import { ENTRIES_SERVICE_TOKEN } from "../modules/entries/entries.tokens.js";
import type { EntriesService } from "../modules/entries/services/entries.service.js";
import {
  EDITORIAL_ENTRY_OPERATIONS,
  type EditorialEntryOperations
} from "../operations/editorial-entry-operations.js";
export const EDITORIAL_OPERATIONS = pluginOperationsProvider(
  createToken<PluginOperationsProvider>("EDITORIAL_OPERATIONS"),
  "editorial-pack",
  (
    contentTypes: ContentTypesService,
    entries: EntriesService,
    operations: EditorialEntryOperations
  ) => [
    {
      name: "entries.create",
      requiredPermission: "editorial-pack:entries:create",
      input: CreateEntryInputSchema,
      invoke: (input, context) =>
        operations.createEntry(context.operationContext, input as CreateEntryInput)
    },
    {
      name: "entries.get",
      requiredPermission: "editorial-pack:entries:read",
      input: s.object({ id: s.string({ minLength: 1 }) }, { strict: true }),
      invoke: (input, context) =>
        operations.getEntry(context.operationContext, (input as { id: string }).id)
    },
    {
      name: "entries.update",
      requiredPermission: "editorial-pack:entries:update",
      input: s.object(
        { id: s.string({ minLength: 1 }), input: UpdateEntryInputSchema },
        { strict: true }
      ),
      invoke: (input, context) => {
        const request = input as { id: string; input: UpdateEntryInput };
        return operations.updateEntry(context.operationContext, request.id, request.input);
      }
    },
    {
      name: "entries.transition",
      requiredPermission: "editorial-pack:entries:read",
      input: s.object(
        { id: s.string({ minLength: 1 }), transition: s.string({ minLength: 1 }) },
        { strict: true }
      ),
      invoke: (input, context) => {
        const request = input as { id: string; transition: string };
        return operations.transitionEntry(context.operationContext, request.id, request.transition);
      }
    },
    {
      name: "entries.restore",
      requiredPermission: "editorial-pack:revisions:restore",
      input: s.object(
        { id: s.string({ minLength: 1 }), revisionId: s.string({ minLength: 1 }) },
        { strict: true }
      ),
      invoke: (input, context) => {
        const request = input as { id: string; revisionId: string };
        return operations.restoreRevision(context.operationContext, request.id, request.revisionId);
      }
    },
    {
      name: "entries.publication",
      requiredPermission: "editorial-pack:entries:publish",
      input: s.object(
        { id: s.string({ minLength: 1 }), expectedVersion: s.number({ int: true, min: 1 }) },
        { strict: true }
      ),
      invoke: (input, context) => {
        const request = input as { id: string; expectedVersion: number };
        return operations.publishSnapshot(
          context.operationContext,
          request.id,
          request.expectedVersion
        );
      }
    },
    {
      name: "initialize",
      private: true,
      input: s.object({}),
      async invoke(_input, context) {
        await contentTypes.ensureDefaultContentTypes();
        entries.setPublisher(undefined);
        await entries.ensureDefaultBlogContent();
        entries.setPublisher(context.events);
        return null;
      }
    }
  ],
  [CONTENT_TYPES_SERVICE_TOKEN, ENTRIES_SERVICE_TOKEN, EDITORIAL_ENTRY_OPERATIONS]
);
