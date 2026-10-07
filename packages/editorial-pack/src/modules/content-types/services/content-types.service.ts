import type { DbAdapter } from "@trinacria-cms/kernel";
import type {
  OperationAuthorizer,
  OperationContext,
  PluginEventPublisher
} from "@trinacria-cms/kernel/contracts";
import type { MongoDurableEventStore } from "@trinacria-cms/kernel/runtime";
import { assertOperationContext, createPluginDbScope } from "@trinacria-cms/kernel/runtime";
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
  readonly code: string = "validation_error";
  constructor(message: string) {
    super(message);
    this.name = "ContentTypeValidationError";
  }
}

export class ContentTypeConflictError extends ContentTypeValidationError {
  readonly code = "conflict";
}

export class ContentTypesService {
  constructor(
    private readonly repository: ContentTypesRepository,
    private readonly db?: DbAdapter,
    private readonly sessionDb?: DbAdapter,
    private readonly authorization?: { context: OperationContext; authorizer: OperationAuthorizer },
    private readonly durable?: MongoDurableEventStore,
    private readonly publisher?: PluginEventPublisher
  ) {}

  withAuthorization(context: OperationContext, authorizer: OperationAuthorizer) {
    assertOperationContext(context);
    return new ContentTypesService(
      this.repository,
      this.db,
      this.sessionDb,
      {
        context,
        authorizer
      },
      this.durable,
      this.publisher
    );
  }
  private async assertAction(action: "read" | "manage", id?: string) {
    if (this.authorization)
      await this.authorization.authorizer.assert(this.authorization.context, {
        ownerPluginId: "editorial-pack",
        resource: "content-types",
        action,
        resourceId: id
      });
  }

  async createContentType(
    input: CreateContentTypeInput,
    createdByUserId: string
  ): Promise<ContentTypeRecord> {
    if (this.db) return this.atomic((service) => service.createContentType(input, createdByUserId));
    await this.assertAction("manage");
    const parsed = CreateContentTypeInputSchema.parse(input);
    this.assertFieldsAreValid(parsed.fields);
    this.assertDeliveryFields(parsed.delivery, parsed.fields);
    if (parsed.workflow) this.assertWorkflowIsValid(parsed.workflow);
    const existing = await this.repository.findByKey(parsed.key);
    if (existing) {
      throw new ContentTypeConflictError(`Content type key "${parsed.key}" is already in use`);
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

  async getContentTypeForEntry(id: string, fence = false) {
    const record = await this.repository.findById(id);
    if (!record || !fence) return record;
    const locked = await this.repository.fence(id, record.version);
    if (!locked) throw new ContentTypeConflictError("Il modello è cambiato. Aggiorna e riprova.");
    return locked;
  }

  async getContentType(id: string) {
    await this.assertAction("read", id);
    return this.repository.findById(id);
  }

  async listContentTypes(options?: {
    status?: ContentTypeRecord["status"];
    deleted?: boolean;
    limit?: number;
    offset?: number;
  }) {
    await this.assertAction("read");
    return this.repository.list(options);
  }

  async updateContentType(
    id: string,
    input: UpdateContentTypeInput
  ): Promise<ContentTypeRecord | null> {
    if (this.db) return this.atomic((service) => service.updateContentType(id, input));
    await this.assertAction("manage", id);
    const parsed = UpdateContentTypeInputSchema.parse(input);
    if (parsed.fields) this.assertFieldsAreValid(parsed.fields);
    if (parsed.workflow) this.assertWorkflowIsValid(parsed.workflow);
    const current = await this.repository.findById(id);
    if (!current) return null;
    this.assertDeliveryFields(parsed.delivery ?? current.delivery, parsed.fields ?? current.fields);
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
        throw new ContentTypeConflictError(
          "Questo modello contiene entry: rimozione/cambio dei campi, nuovi campi obbligatori e cambi di workflow richiedono una migrazione esplicita."
        );
    }
    const updated = await this.repository.update(id, parsed, current.version);
    if (!updated) throw new ContentTypeConflictError("Il modello è cambiato. Aggiorna e riprova.");
    await this.publisher?.emit("delivery-invalidated", { scope: "content-type", id });
    return updated;
  }

  async deleteContentType(id: string): Promise<ContentTypeRecord | null> {
    if (this.db) return this.atomic((service) => service.deleteContentType(id));
    await this.assertAction("manage", id);
    await this.assertEmpty(id);
    return this.repository.softDelete(id);
  }

  async restoreContentType(id: string): Promise<ContentTypeRecord | null> {
    if (this.db) return this.atomic((service) => service.restoreContentType(id));
    await this.assertAction("manage", id);
    return this.repository.restore(id);
  }

  async permanentlyDeleteContentType(id: string): Promise<boolean> {
    if (this.db) return this.atomic((service) => service.permanentlyDeleteContentType(id));
    await this.assertAction("manage", id);
    await this.assertEmpty(id);
    return this.repository.hardDelete(id);
  }

  private assertDeliveryFields(
    delivery: ContentTypeRecord["delivery"],
    fields: ContentTypeRecord["fields"]
  ) {
    if (delivery?.publicFields.some((key) => !fields.some((field) => field.key === key)))
      throw new ContentTypeValidationError("Delivery publicFields must reference declared fields");
  }

  private async atomic<T>(work: (service: ContentTypesService) => Promise<T>): Promise<T> {
    if (this.durable)
      return this.durable.transaction("editorial-pack", (db, publisher) =>
        work(
          new ContentTypesService(
            new ContentTypesRepository(db),
            undefined,
            db,
            this.authorization,
            undefined,
            publisher
          )
        )
      );
    if (!this.db?.withTransaction)
      throw new ContentTypeValidationError(
        "Editorial writes require MongoDB replica-set transactions"
      );
    return this.db.withTransaction({ pluginId: "editorial-pack" }, (db) =>
      work(
        new ContentTypesService(new ContentTypesRepository(db), undefined, db, this.authorization)
      )
    );
  }

  private async hasEntries(contentTypeId: string): Promise<boolean> {
    const db = this.sessionDb ?? this.db;
    if (!db) return false;
    const entries = createPluginDbScope(db, "editorial-pack").repository("entries");
    return !!(await entries.findOne({ filter: { contentTypeId } }));
  }

  private async assertEmpty(id: string) {
    if (await this.hasEntries(id))
      throw new ContentTypeConflictError("Elimina o migra le entry prima di eliminare il modello.");
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
