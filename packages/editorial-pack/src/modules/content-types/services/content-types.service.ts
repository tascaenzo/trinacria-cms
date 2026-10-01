import { createPluginDbScope, type DbAdapter } from "@trinacria-cms/kernel";
import {
  type CreateContentTypeInput,
  CreateContentTypeInputSchema,
  type UpdateContentTypeInput,
  UpdateContentTypeInputSchema
} from "../content-types.input.js";
import type {
  ContentTypeField,
  ContentTypeRecord,
  ContentWorkflow
} from "../content-types.schemas.js";
import type { ContentTypesRepository } from "../repositories/content-types.repository.js";

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
  readonly code = "validation_error";
  constructor(message: string) {
    super(message);
    this.name = "ContentTypeValidationError";
  }
}

export class ContentTypesService {
  constructor(
    private readonly repository: ContentTypesRepository,
    private readonly db?: DbAdapter
  ) {}

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
    deleted?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return this.repository.list(options);
  }

  async updateContentType(id: string, input: UpdateContentTypeInput) {
    const parsed = UpdateContentTypeInputSchema.parse(input);
    if (parsed.fields) this.assertFieldsAreValid(parsed.fields);
    if (parsed.workflow) this.assertWorkflowIsValid(parsed.workflow);
    const current = await this.repository.findById(id);
    if (!current) return null;
    if (await this.hasEntries(id)) {
      const nextFields = parsed.fields ?? current.fields;
      const incompatible =
        current.fields.some((field) => {
          const next = nextFields.find((candidate) => candidate.key === field.key);
          if (
            !next ||
            next.type !== field.type ||
            next.multiple !== field.multiple ||
            (!field.required && next.required)
          )
            return true;
          if (field.type === "select") {
            const before = (field.config as { options?: string[] } | undefined)?.options ?? [];
            const after = (next.config as { options?: string[] } | undefined)?.options ?? [];
            if (before.some((option) => !after.includes(option))) return true;
          }
          return (
            field.type === "relation" &&
            JSON.stringify(field.config) !== JSON.stringify(next.config)
          );
        }) ||
        nextFields.some(
          (field) => field.required && !current.fields.some((before) => before.key === field.key)
        );
      const workflowChanges =
        (parsed.workflowId !== undefined && parsed.workflowId !== current.workflowId) ||
        (parsed.clearWorkflow && !!current.workflowId) ||
        (parsed.clearWorkflowDefinition && !!current.workflow) ||
        (parsed.workflow !== undefined &&
          JSON.stringify(parsed.workflow) !== JSON.stringify(current.workflow));
      if (incompatible || workflowChanges)
        throw new ContentTypeValidationError(
          "Questo modello contiene entry: rimozione/cambio dei campi, nuovi campi obbligatori e cambi di workflow richiedono una migrazione esplicita."
        );
    }
    return this.repository.update(id, parsed);
  }

  async deleteContentType(id: string) {
    await this.assertEmpty(id);
    return this.repository.softDelete(id);
  }

  async restoreContentType(id: string) {
    return this.repository.restore(id);
  }

  async permanentlyDeleteContentType(id: string) {
    await this.assertEmpty(id);
    return this.repository.hardDelete(id);
  }

  private async hasEntries(contentTypeId: string): Promise<boolean> {
    if (!this.db) return false;
    const entries = createPluginDbScope(this.db, "editorial-pack").repository("entries");
    return !!(await entries.findOne({ filter: { contentTypeId } }));
  }

  private async assertEmpty(id: string) {
    if (await this.hasEntries(id))
      throw new ContentTypeValidationError(
        "Elimina o migra le entry prima di eliminare il modello."
      );
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
      const config = field.config as
        | { options?: readonly string[]; targetContentTypeId?: string }
        | undefined;
      if (field.type === "select" && !config?.options?.length) {
        throw new ContentTypeValidationError(
          `Select field "${field.key}" must define at least one option`
        );
      }
      if (field.type === "relation" && !config?.targetContentTypeId) {
        throw new ContentTypeValidationError(
          `Relation field "${field.key}" must define a target content type`
        );
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
      // Never reintroduce fields removed by an administrator during bootstrap.
      return;
    }
    await this.repository.create({ ...input, createdByUserId: "system:editorial-pack" });
  }
}
