import type { ContentTypeRecord } from "../../content-types/content-types.schemas.js";
import { ContentTypesService } from "../../content-types/services/content-types.service.js";
import {
  CreateEntryInputSchema,
  UpdateEntryInputSchema,
  type CreateEntryInput,
  type UpdateEntryInput
} from "../entries.input.js";
import type { EntryRecord } from "../entries.schemas.js";
import { EntriesRepository } from "../repositories/entries.repository.js";

export class EntryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntryValidationError";
  }
}

export class EntriesService {
  constructor(
    private readonly repository: EntriesRepository,
    private readonly contentTypes: ContentTypesService
  ) {}

  async createEntry(input: CreateEntryInput, ownerUserId: string): Promise<EntryRecord> {
    const parsed = CreateEntryInputSchema.parse(input);
    const contentType = await this.requireActiveContentType(parsed.contentTypeId);
    this.validateData(contentType, parsed.data as Record<string, unknown>);
    return this.repository.create({ ...parsed, ownerUserId });
  }

  async getEntry(id: string) {
    return this.repository.findById(id);
  }

  async listEntries(options?: Parameters<EntriesRepository["list"]>[0]) {
    return this.repository.list(options);
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
