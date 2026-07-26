import { type Infer, s } from "@trinacria-cms/kernel";
import {
  ContentTypeFieldSchema,
  ContentTypeOwnershipScopeSchema,
  ContentTypeStatusSchema,
  ContentWorkflowSchema
} from "./content-types.schemas.js";

export const CreateContentTypeInputSchema = s.object(
  {
    key: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 80,
      pattern: /^[a-z][a-z0-9-]*$/
    }),
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    icon: s.string({ trim: true, minLength: 1, maxLength: 80 }).optional(),
    fields: s.array(ContentTypeFieldSchema, { unique: false }),
    taxonomyIds: s.array(s.string({ trim: true, minLength: 1 }), { unique: true }).optional(),
    workflowId: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    workflow: ContentWorkflowSchema.optional(),
    ownershipScope: ContentTypeOwnershipScopeSchema.optional()
  },
  { strict: true }
);

export type CreateContentTypeInput = Infer<typeof CreateContentTypeInputSchema>;

export const UpdateContentTypeInputSchema = s.object(
  {
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    clearDescription: s.boolean().optional(),
    icon: s.string({ trim: true, minLength: 1, maxLength: 80 }).optional(),
    clearIcon: s.boolean().optional(),
    status: ContentTypeStatusSchema.optional(),
    fields: s.array(ContentTypeFieldSchema, { unique: false }).optional(),
    taxonomyIds: s.array(s.string({ trim: true, minLength: 1 }), { unique: true }).optional(),
    workflowId: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    clearWorkflow: s.boolean().optional(),
    workflow: ContentWorkflowSchema.optional(),
    clearWorkflowDefinition: s.boolean().optional(),
    ownershipScope: ContentTypeOwnershipScopeSchema.optional()
  },
  { strict: true }
);

export type UpdateContentTypeInput = Infer<typeof UpdateContentTypeInputSchema>;
