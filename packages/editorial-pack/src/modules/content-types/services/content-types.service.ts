import {
  CreateContentTypeInputSchema,
  UpdateContentTypeInputSchema,
  type CreateContentTypeInput,
  type UpdateContentTypeInput
} from "../content-types.input.js";
import type {
  ContentTypeField,
  ContentTypeRecord,
  ContentWorkflow
} from "../content-types.schemas.js";
import { ContentTypesRepository } from "../repositories/content-types.repository.js";

const RESERVED_FIELD_KEYS = new Set([
  "id",
  "content_type_id",
  "created_at",
  "updated_at",
  "status",
  "owner_user_id",
  "title",
  "slug",
  "body"
]);

export class ContentTypeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentTypeValidationError";
  }
}

export class ContentTypesService {
  constructor(private readonly repository: ContentTypesRepository) {}

  async createContentType(
    input: CreateContentTypeInput,
    createdByUserId: string
  ): Promise<ContentTypeRecord> {
    const parsed = CreateContentTypeInputSchema.parse(input);
    this.assertFieldsAreValid(parsed.fields);
    if (parsed.workflow) this.assertWorkflowIsValid(parsed.workflow);
    const existing = await this.repository.findByKey(parsed.key);
    if (existing) {
      throw new ContentTypeValidationError(`Content type key "${parsed.key}" is already in use`);
    }
    return this.repository.create({ ...parsed, createdByUserId });
  }

  /** Creates the usable blog baseline once, without overwriting local changes. */
  async ensureDefaultContentTypes(): Promise<void> {
    await this.ensureDefaultContentType({
      key: "article",
      name: "Article",
      description: "Long-form editorial content for a blog or newsroom.",
      workflowId: "review",
      fields: [
        {
          key: "excerpt",
          label: "Excerpt",
          type: "text",
          required: false,
          multiple: false
        },
        {
          key: "cover_image",
          label: "Cover image",
          type: "media",
          required: false,
          multiple: false
        },
        {
          key: "category",
          label: "Categoria",
          type: "select",
          required: false,
          multiple: false,
          config: { options: ["Tecnologia", "Cultura", "Lifestyle"] }
        },
        {
          key: "tags",
          label: "Tag",
          type: "text",
          required: false,
          multiple: true
        }
      ]
    });
    await this.ensureDefaultContentType({
      key: "page",
      name: "Page",
      description: "Standalone site page with title, slug and block content.",
      workflowId: "direct",
      fields: []
    });
  }

  async getContentType(id: string) {
    return this.repository.findById(id);
  }

  async listContentTypes(options?: {
    status?: ContentTypeRecord["status"];
    limit?: number;
    offset?: number;
  }) {
    return this.repository.list(options);
  }

  async updateContentType(id: string, input: UpdateContentTypeInput) {
    const parsed = UpdateContentTypeInputSchema.parse(input);
    if (parsed.fields) this.assertFieldsAreValid(parsed.fields);
    if (parsed.workflow) this.assertWorkflowIsValid(parsed.workflow);
    return this.repository.update(id, parsed);
  }

  private assertFieldsAreValid(fields: readonly ContentTypeField[]) {
    const fieldKeys = new Set<string>();
    for (const field of fields) {
      if (RESERVED_FIELD_KEYS.has(field.key)) {
        throw new ContentTypeValidationError(`Field key "${field.key}" is reserved`);
      }
      if (fieldKeys.has(field.key)) {
        throw new ContentTypeValidationError(`Field key "${field.key}" is duplicated`);
      }
      fieldKeys.add(field.key);
    }
  }

  private assertWorkflowIsValid(workflow: ContentWorkflow) {
    if (!workflow.states.length) {
      throw new ContentTypeValidationError("A workflow must contain at least one state");
    }
    const stateKeys = new Set<string>();
    let initialCount = 0;
    for (const state of workflow.states) {
      if (stateKeys.has(state.key)) {
        throw new ContentTypeValidationError(`Workflow state key "${state.key}" is duplicated`);
      }
      stateKeys.add(state.key);
      if (state.initial) initialCount += 1;
    }
    if (initialCount !== 1) {
      throw new ContentTypeValidationError("A workflow must define exactly one initial state");
    }
    const transitionKeys = new Set<string>();
    for (const transition of workflow.transitions) {
      if (transitionKeys.has(transition.key)) {
        throw new ContentTypeValidationError(
          `Workflow transition key "${transition.key}" is duplicated`
        );
      }
      transitionKeys.add(transition.key);
      if (!stateKeys.has(transition.from) || !stateKeys.has(transition.to)) {
        throw new ContentTypeValidationError(
          `Workflow transition "${transition.key}" references an unknown state`
        );
      }
    }
  }

  private async ensureDefaultContentType(input: CreateContentTypeInput) {
    const existing = await this.repository.findByKey(input.key);
    if (existing) {
      // Upgrade only the system baseline, retaining custom fields and any user-owned model.
      if (existing.createdByUserId === "system:editorial-pack") {
        const missingFields = input.fields.filter(
          (field) => !existing.fields.some((current) => current.key === field.key)
        );
        await this.repository.update(existing.id, {
          ...(missingFields.length ? { fields: [...existing.fields, ...missingFields] } : {}),
          ...(existing.workflowId ? {} : { workflowId: input.workflowId })
        });
      }
      return;
    }
    await this.repository.create({ ...input, createdByUserId: "system:editorial-pack" });
  }
}
