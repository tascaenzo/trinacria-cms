import { randomUUID } from "node:crypto";
import type { DbAdapter } from "@trinacria-cms/kernel";
import { createPluginDbScope, type PluginDbScope } from "@trinacria-cms/kernel/runtime";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../../plugin/editorial-pack.constants.js";
import { editorialPagination } from "../../editorial-pagination.js";
import type { CreateContentTypeInput, UpdateContentTypeInput } from "../content-types.input.js";
import {
  type ContentTypeRecord,
  ContentTypeRecordSchema,
  disabledDelivery
} from "../content-types.schemas.js";

const CONTENT_TYPES_ENTITY_NAME = "content_types";

export class ContentTypesRepository {
  private scope?: PluginDbScope;

  constructor(private readonly db: DbAdapter) {}

  async create(
    input: CreateContentTypeInput & { createdByUserId: string }
  ): Promise<ContentTypeRecord> {
    const now = new Date().toISOString();
    const record = await this.repository().insertOne({
      id: randomUUID(),
      key: input.key,
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      ...(input.icon ? { icon: input.icon } : {}),
      status: "active" as const,
      version: 1,
      delivery: input.delivery ?? disabledDelivery(),
      deliveryConfigVersion: 1,
      fields: input.fields,
      taxonomyIds: input.taxonomyIds ?? [],
      ...(input.workflowId ? { workflowId: input.workflowId } : {}),
      ...(input.workflow ? { workflow: input.workflow } : {}),
      ownershipScope: input.ownershipScope ?? "inherit",
      createdByUserId: input.createdByUserId.trim(),
      createdAt: now,
      updatedAt: now
    });
    return ContentTypeRecordSchema.parse(record);
  }

  async findById(
    id: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<ContentTypeRecord | null> {
    return this.repository().findOne({
      filter: {
        id: id.trim(),
        ...(options.includeDeleted ? {} : { deletedAt: { $exists: false } })
      },
      parse: (value: unknown) => ContentTypeRecordSchema.parse(value)
    });
  }

  async findByKey(key: string): Promise<ContentTypeRecord | null> {
    return this.repository().findOne({
      filter: { key: key.trim().toLowerCase() },
      parse: (value: unknown) => ContentTypeRecordSchema.parse(value)
    });
  }

  async list(
    options: {
      status?: ContentTypeRecord["status"];
      deleted?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const filter: Record<string, unknown> = {
      deletedAt: { $exists: options.deleted === true }
    };
    if (options.status) filter.status = options.status;
    return this.repository().findMany({
      filter,
      ...editorialPagination(options),
      sort: { updatedAt: "desc", id: "asc" },
      parse: (value: unknown) => ContentTypeRecordSchema.parse(value)
    });
  }

  async update(
    id: string,
    input: UpdateContentTypeInput,
    version?: number
  ): Promise<ContentTypeRecord | null> {
    if (version === undefined) {
      const current = await this.findById(id);
      if (!current) return null;
      version = current.version;
    }
    const patch: Partial<ContentTypeRecord> = {
      updatedAt: new Date().toISOString(),
      version: version + 1
    };
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.clearDescription) patch.description = undefined;
    if (input.icon !== undefined) patch.icon = input.icon;
    if (input.clearIcon) patch.icon = undefined;
    if (input.status !== undefined) patch.status = input.status;
    if (input.fields !== undefined) patch.fields = input.fields;
    if (input.delivery !== undefined || input.fields !== undefined) {
      const current = await this.findById(id);
      if (!current || current.version !== version) return null;
      if (input.delivery !== undefined) patch.delivery = input.delivery;
      patch.deliveryConfigVersion = (current.deliveryConfigVersion ?? 1) + 1;
    }
    if (input.taxonomyIds !== undefined) patch.taxonomyIds = input.taxonomyIds;
    if (input.workflowId !== undefined) patch.workflowId = input.workflowId;
    if (input.clearWorkflow) patch.workflowId = undefined;
    if (input.workflow !== undefined) patch.workflow = input.workflow;
    if (input.clearWorkflowDefinition) patch.workflow = undefined;
    if (input.ownershipScope !== undefined) patch.ownershipScope = input.ownershipScope;

    const updated = await this.repository().updateOne(
      {
        filter: {
          id: id.trim(),
          deletedAt: { $exists: false },
          ...(version !== undefined ? { version } : {})
        }
      },
      patch
    );
    return updated ? ContentTypeRecordSchema.parse(updated) : null;
  }

  async softDelete(id: string): Promise<ContentTypeRecord | null> {
    const deletedAt = new Date().toISOString();
    const updated = await this.repository().updateOne(
      { filter: { id: id.trim(), deletedAt: { $exists: false } } },
      { deletedAt, updatedAt: deletedAt }
    );
    return updated ? ContentTypeRecordSchema.parse(updated) : null;
  }

  async restore(id: string): Promise<ContentTypeRecord | null> {
    const updated = await this.repository().updateOne(
      { filter: { id: id.trim(), deletedAt: { $exists: true } } },
      { deletedAt: undefined, updatedAt: new Date().toISOString() }
    );
    return updated ? ContentTypeRecordSchema.parse(updated) : null;
  }

  async hardDelete(id: string): Promise<boolean> {
    return this.repository().deleteOne({
      filter: { id: id.trim(), deletedAt: { $exists: true } }
    });
  }

  async fence(id: string, version: number): Promise<ContentTypeRecord | null> {
    const updated = await this.repository().updateOne(
      { filter: { id, version, deletedAt: { $exists: false } } },
      { version: version + 1 }
    );
    return updated ? ContentTypeRecordSchema.parse(updated) : null;
  }

  private repository() {
    this.scope = this.scope ?? createPluginDbScope(this.db, EDITORIAL_PACK_PLUGIN_ID);
    return this.scope.repository<ContentTypeRecord>(CONTENT_TYPES_ENTITY_NAME);
  }
}
