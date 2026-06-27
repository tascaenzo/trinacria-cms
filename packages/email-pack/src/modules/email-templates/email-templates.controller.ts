import {
  type KernelAdminRouteGuard,
  createPluginApiResponder,
  HttpController,
  parseQueryNumber,
  toOpenApiSchema,
  type HttpContext
} from "@trinacria-cms/kernel";
import { EMAIL_PACK_PLUGIN_ID } from "../../plugin/email-pack.constants.js";
import { EmailTemplateRecordSchema } from "./email-templates.schemas.js";
import type { EmailTemplatesService } from "./email-templates.service.js";
import {
  PreviewEmailTemplateInputSchema,
  UpsertEmailTemplateInputSchema
} from "./dto/email-templates.input.dto.js";

const responder = createPluginApiResponder(EMAIL_PACK_PLUGIN_ID);

export class EmailTemplatesController extends HttpController {
  constructor(
    private readonly templates: EmailTemplatesService,
    private readonly adminRouteGuard: KernelAdminRouteGuard
  ) {
    super();
  }

  routes() {
    return this.router()
      .get("/v1/email/templates", this.listTemplates, {
        middlewares: [this.adminRouteGuard.middleware],
        docs: {
          summary: "List email templates",
          tags: ["Email"],
          operationId: "listEmailTemplates",
          security: this.adminRouteGuard.security,
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 200 }
            },
            {
              name: "offset",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 0 }
            }
          ],
          responses: {
            200: { description: "Email templates list" }
          }
        }
      })
      .put("/v1/email/templates", this.upsertTemplate, {
        middlewares: [this.adminRouteGuard.middleware],
        docs: {
          summary: "Upsert email template",
          tags: ["Email"],
          operationId: "upsertEmailTemplate",
          security: this.adminRouteGuard.security,
          requestBody: { required: true, schema: toOpenApiSchema(UpsertEmailTemplateInputSchema) },
          responses: {
            200: {
              description: "Email template",
              schema: toOpenApiSchema(EmailTemplateRecordSchema)
            }
          }
        }
      })
      .post("/v1/email/templates/preview", this.previewTemplate, {
        middlewares: [this.adminRouteGuard.middleware],
        docs: {
          summary: "Preview email template",
          tags: ["Email"],
          operationId: "previewEmailTemplate",
          security: this.adminRouteGuard.security,
          requestBody: { required: true, schema: toOpenApiSchema(PreviewEmailTemplateInputSchema) },
          responses: {
            200: { description: "Rendered email preview" }
          }
        }
      })
      .build();
  }

  private listTemplates = async (ctx: HttpContext) => {
    try {
      const templates = await this.templates.listTemplates({
        limit: parseQueryNumber(ctx.query.limit),
        offset: parseQueryNumber(ctx.query.offset)
      });
      return responder.list(templates);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private upsertTemplate = async (ctx: HttpContext) => {
    try {
      const payload = UpsertEmailTemplateInputSchema.parse(ctx.body);
      return responder.success(await this.templates.upsertTemplate(payload));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private previewTemplate = async (ctx: HttpContext) => {
    try {
      const payload = PreviewEmailTemplateInputSchema.parse(ctx.body);
      return responder.success(await this.templates.render(payload));
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
