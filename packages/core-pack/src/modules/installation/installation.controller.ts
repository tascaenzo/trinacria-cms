import {
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  toOpenApiSchema
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { CORE_PACK_OPENAPI_TAGS } from "../openapi-tags.js";
import {
  InstallationBootstrapResponseSchema,
  InstallationErrorResponseSchema,
  InstallationStatusResponseSchema,
  InstallBootstrapInputSchema
} from "./dto/index.js";
import type { InstallationService } from "./services/installation.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

/**
 * Public bootstrap API for first CMS installation phase.
 */
export class InstallationController extends HttpController {
  constructor(private readonly installation: InstallationService) {
    super();
  }

  routes() {
    return this.router()
      .get("/v1/install/status", this.getStatus, {
        docs: {
          summary: "Read CMS installation status",
          tags: [CORE_PACK_OPENAPI_TAGS.INSTALLATION],
          operationId: "getInstallationStatus",
          responses: {
            200: {
              description: "Current installation status",
              schema: toOpenApiSchema(InstallationStatusResponseSchema)
            }
          }
        }
      })
      .post("/v1/install/bootstrap", this.bootstrap, {
        docs: {
          summary: "Bootstrap CMS installation with site and admin account",
          tags: [CORE_PACK_OPENAPI_TAGS.INSTALLATION],
          operationId: "bootstrapInstallation",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(InstallBootstrapInputSchema)
          },
          responses: {
            200: {
              description: "Installation bootstrap completed",
              schema: toOpenApiSchema(InstallationBootstrapResponseSchema)
            },
            400: {
              description: "Invalid input or password mismatch",
              schema: toOpenApiSchema(InstallationErrorResponseSchema)
            },
            409: {
              description: "Installation already completed",
              schema: toOpenApiSchema(InstallationErrorResponseSchema)
            }
          }
        }
      })
      .build();
  }

  private getStatus = async (_ctx: HttpContext) => {
    try {
      const status = await this.installation.getStatus();
      return responder.success(status);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private bootstrap = async (ctx: HttpContext) => {
    try {
      const payload = InstallBootstrapInputSchema.parse(ctx.body);
      const result = await this.installation.bootstrap(payload);
      return responder.success(result);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
