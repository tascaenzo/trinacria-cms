import {
  CreateContentTypeInputSchema,
  UpdateContentTypeInputSchema,
  type CreateContentTypeInput,
  type UpdateContentTypeInput
} from "../content-types.input.js";
import type { ContentTypeField, ContentTypeRecord } from "../content-types.schemas.js";
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
    const existing = await this.repository.findByKey(parsed.key);
    if (existing) {
      throw new ContentTypeValidationError(`Content type key "${parsed.key}" is already in use`);
    }
    return this.repository.create({ ...parsed, createdByUserId });
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
}
