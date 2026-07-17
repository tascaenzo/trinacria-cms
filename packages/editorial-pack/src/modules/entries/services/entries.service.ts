import type {
  ContentTypeRecord,
  ContentWorkflow
} from "../../content-types/content-types.schemas.js";
import { ContentTypesService } from "../../content-types/services/content-types.service.js";
import {
  CreateEntryInputSchema,
  UpdateEntryInputSchema,
  type CreateEntryInput,
  type UpdateEntryInput
} from "../entries.input.js";
import type { EntryRecord } from "../entries.schemas.js";
import { EntriesRepository } from "../repositories/entries.repository.js";
import { randomUUID } from "node:crypto";

export class EntryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntryValidationError";
  }
}

export type EditorialTransition = string;

const REVIEW_WORKFLOW: ContentWorkflow = {
  preset: "review",
  states: [
    { key: "draft", label: "Bozza", initial: true },
    { key: "in_review", label: "In revisione", initial: false },
    { key: "approved", label: "Approvato", initial: false },
    { key: "published", label: "Pubblicato", initial: false }
  ],
  transitions: [
    { key: "submit", label: "Invia in revisione", from: "draft", to: "in_review" },
    { key: "approve", label: "Approva", from: "in_review", to: "approved" },
    {
      key: "request_changes",
      label: "Richiedi modifiche",
      from: "in_review",
      to: "draft"
    },
    { key: "publish", label: "Pubblica", from: "approved", to: "published" },
    {
      key: "unpublish",
      label: "Rimuovi dalla pubblicazione",
      from: "published",
      to: "draft"
    }
  ]
};

const DIRECT_WORKFLOW: ContentWorkflow = {
  preset: "direct",
  states: [
    { key: "draft", label: "Bozza", initial: true },
    { key: "published", label: "Pubblicato", initial: false }
  ],
  transitions: [
    { key: "publish", label: "Pubblica", from: "draft", to: "published" },
    {
      key: "unpublish",
      label: "Rimuovi dalla pubblicazione",
      from: "published",
      to: "draft"
    }
  ]
};

export class EntriesService {
  constructor(
    private readonly repository: EntriesRepository,
    private readonly contentTypes: ContentTypesService
  ) {}

  async createEntry(input: CreateEntryInput, ownerUserId: string): Promise<EntryRecord> {
    const parsed = CreateEntryInputSchema.parse(input);
    const contentType = await this.requireActiveContentType(parsed.contentTypeId);
    this.validateData(contentType, parsed.data as Record<string, unknown>);
    return this.repository.create({
      ...parsed,
      ownerUserId,
      initialStatus:
        resolveWorkflow(contentType).states.find((state) => state.initial)?.key ?? "draft"
    });
  }

  async getEntry(id: string) {
    return this.repository.findById(id);
  }

  async listEntries(options?: Parameters<EntriesRepository["list"]>[0]) {
    return this.repository.list(options);
  }

  /** Seeds a small, immediately understandable blog only when the workspace is empty. */
  async ensureDefaultBlogContent(): Promise<void> {
    if ((await this.repository.list({ limit: 1 })).length > 0) return;
    const contentTypes = await this.contentTypes.listContentTypes({ status: "active", limit: 20 });
    const article = contentTypes.find((contentType) => contentType.key === "article");
    const page = contentTypes.find((contentType) => contentType.key === "page");
    if (article) {
      await this.createEntry(
        {
          contentTypeId: article.id,
          title: "Benvenuto nel tuo nuovo blog",
          slug: "benvenuto-nel-tuo-nuovo-blog",
          data: { category: "Tecnologia", tags: ["CMS", "Editoriale"] }
        },
        "system:editorial-pack"
      );
    }
    if (page) {
      await this.createEntry(
        {
          contentTypeId: page.id,
          title: "Chi siamo",
          slug: "chi-siamo",
          data: {}
        },
        "system:editorial-pack"
      );
    }
  }

  async updateEntry(id: string, input: UpdateEntryInput) {
    const parsed = UpdateEntryInputSchema.parse(input);
    const entry = await this.repository.findById(id);
    if (!entry) return null;
    if (parsed.data !== undefined) {
      const contentType = await this.requireActiveContentType(entry.contentTypeId);
      this.validateData(contentType, parsed.data as Record<string, unknown>);
    }
    return this.repository.update(entry.id, parsed);
  }

  async transitionEntry(id: string, transition: EditorialTransition, actorUserId: string) {
    const entry = await this.repository.findById(id);
    if (!entry) return null;
    const contentType = await this.requireActiveContentType(entry.contentTypeId);
    const configuredWorkflow = resolveWorkflow(contentType);
    const configuredTransition = configuredWorkflow.transitions.find(
      (candidate) => candidate.key === transition && candidate.from === entry.status
    );
    if (!configuredTransition) {
      throw new EntryValidationError(
        `Transition "${transition}" is not available from status "${entry.status}"`
      );
    }
    const updated = await this.repository.updateStatus(entry.id, configuredTransition.to);
    if (!updated) return null;
    const revision = {
      id: randomUUID(),
      entryId: updated.id,
      revisionNumber: (updated.revisions?.length ?? 0) + 1,
      reason: `transition:${transition}` as const,
      snapshotJson: JSON.stringify(updated),
      createdByUserId: actorUserId,
      createdAt: new Date().toISOString()
    };
    return (await this.repository.appendRevision(updated, revision)) ?? updated;
  }

  async listRevisions(entryId: string) {
    const entry = await this.repository.findById(entryId);
    if (!entry) return null;
    return entry.revisions ?? [];
  }

  private async requireActiveContentType(contentTypeId: string): Promise<ContentTypeRecord> {
    const contentType = await this.contentTypes.getContentType(contentTypeId);
    if (!contentType) {
      throw new EntryValidationError(`Content type "${contentTypeId}" does not exist`);
    }
    if (contentType.status !== "active") {
      throw new EntryValidationError(`Content type "${contentType.key}" is archived`);
    }
    return contentType;
  }

  private validateData(contentType: ContentTypeRecord, data: Record<string, unknown>) {
    const allowedKeys = new Set(contentType.fields.map((field) => field.key));
    for (const key of Object.keys(data)) {
      if (!allowedKeys.has(key)) {
        throw new EntryValidationError(
          `Field "${key}" is not defined by content type "${contentType.key}"`
        );
      }
    }
    for (const field of contentType.fields) {
      const value = data[field.key];
      if (value === undefined || value === null) {
        if (field.required) throw new EntryValidationError(`Field "${field.key}" is required`);
        continue;
      }
      if (field.multiple) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new EntryValidationError(`Field "${field.key}" must be a non-empty array`);
        }
        for (const item of value) this.validateFieldValue(field.type, field.key, item);
      } else {
        this.validateFieldValue(field.type, field.key, value);
      }
    }
  }

  private validateFieldValue(type: string, key: string, value: unknown) {
    const isRecord = value !== null && typeof value === "object" && !Array.isArray(value);
    const isString = typeof value === "string" && value.trim().length > 0;
    const valid =
      type === "text" || type === "select" || type === "media" || type === "relation"
        ? isString
        : type === "url"
          ? isString && /^https?:\/\//i.test(value)
          : type === "number"
            ? typeof value === "number" && Number.isFinite(value)
            : type === "boolean"
              ? typeof value === "boolean"
              : type === "date_time"
                ? isString && !Number.isNaN(Date.parse(value))
                : type === "rich_text"
                  ? isRecord || Array.isArray(value)
                  : type === "repeatable"
                    ? Array.isArray(value)
                    : type === "json"
                      ? value !== undefined
                      : false;
    if (!valid) throw new EntryValidationError(`Field "${key}" has an invalid ${type} value`);
  }
}

function resolveWorkflow(contentType: Pick<ContentTypeRecord, "workflowId" | "workflow">) {
  if (contentType.workflow) return contentType.workflow;
  return contentType.workflowId === "direct" ? DIRECT_WORKFLOW : REVIEW_WORKFLOW;
}
