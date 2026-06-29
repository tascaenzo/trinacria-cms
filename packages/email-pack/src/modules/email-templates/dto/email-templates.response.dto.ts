import { toOpenApiSchema } from "@trinacria-cms/kernel";
import { EmailTemplateRecordSchema } from "../email-templates.schemas.js";

const EmailTemplateRecordOpenApiSchema = toOpenApiSchema(EmailTemplateRecordSchema);

export const ListEmailTemplatesResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  required: ["data", "meta"],
  additionalProperties: false,
  properties: {
    data: {
      type: "array",
      items: EmailTemplateRecordOpenApiSchema
    },
    meta: {
      type: "object",
      required: ["pluginId"],
      additionalProperties: true,
      properties: {
        pluginId: { type: "string" },
        total: { type: "number" },
        limit: { type: "number" },
        offset: { type: "number" }
      }
    }
  }
};

export const EmailTemplateResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  required: ["data", "meta"],
  additionalProperties: false,
  properties: {
    data: EmailTemplateRecordOpenApiSchema,
    meta: {
      type: "object",
      required: ["pluginId"],
      additionalProperties: true,
      properties: {
        pluginId: { type: "string" }
      }
    }
  }
};

export const PreviewEmailTemplateResponseOpenApiSchema: Record<string, unknown> = {
  type: "object",
  required: ["data", "meta"],
  additionalProperties: false,
  properties: {
    data: {
      type: "object",
      required: ["templateKey", "locale", "subject", "text"],
      additionalProperties: false,
      properties: {
        templateKey: { type: "string" },
        locale: { type: "string" },
        subject: { type: "string" },
        text: { type: "string" },
        html: { type: "string" }
      }
    },
    meta: {
      type: "object",
      required: ["pluginId"],
      additionalProperties: true,
      properties: {
        pluginId: { type: "string" }
      }
    }
  }
};
