import {
  createJwtAuthMiddleware,
  getAuthenticatedUser,
  type JwtAuthService
} from "@trinacria-cms/core-pack";
import {
  type AuthzService,
  apiError,
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  type HttpMiddleware,
  parseQueryNumber,
  response
} from "@trinacria-cms/kernel";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../plugin/editorial-pack.constants.js";
import {
  CreateContentTypeInputSchema,
  UpdateContentTypeInputSchema
} from "./content-types.input.js";
import type { ContentTypesService } from "./services/content-types.service.js";

const responder = createPluginApiResponder(EDITORIAL_PACK_PLUGIN_ID);

export class ContentTypesController extends HttpController {
  private readonly authenticated: HttpMiddleware;
  private readonly canRead: HttpMiddleware;
  private readonly canManage: HttpMiddleware;

  constructor(
    private readonly contentTypes: ContentTypesService,
    auth: JwtAuthService,
    authz: AuthzService
  ) {
    super();
    this.authenticated = createJwtAuthMiddleware(auth, { requireAdmin: false });
    this.canRead = createEditorialPermissionMiddleware(authz, "content-types", "read");
    this.canManage = createEditorialPermissionMiddleware(authz, "content-types", "manage");
  }

  routes() {
    return this.router()
      .get("/v1/editorial/content-types", this.listContentTypes, {
        middlewares: [this.authenticated, this.canRead]
      })
      .get("/v1/editorial/content-types/deleted", this.listDeletedContentTypes, {
        middlewares: [this.authenticated, this.canManage]
      })
      .get("/v1/editorial/content-types/:id", this.getContentType, {
        middlewares: [this.authenticated, this.canRead]
      })
      .post("/v1/editorial/content-types", this.createContentType, {
        middlewares: [this.authenticated, this.canManage]
      })
      .patch("/v1/editorial/content-types/:id", this.updateContentType, {
        middlewares: [this.authenticated, this.canManage]
      })
      .post("/v1/editorial/content-types/:id/restore", this.restoreContentType, {
        middlewares: [this.authenticated, this.canManage]
      })
      .delete("/v1/editorial/content-types/:id/permanent", this.permanentlyDeleteContentType, {
        middlewares: [this.authenticated, this.canManage]
      })
      .delete("/v1/editorial/content-types/:id", this.deleteContentType, {
        middlewares: [this.authenticated, this.canManage]
      })
      .build();
  }

  private listContentTypes = async (ctx: HttpContext) => {
    try {
      const contentTypes = await this.contentTypes.listContentTypes({
        ...(ctx.query.status === "active" || ctx.query.status === "archived"
          ? { status: ctx.query.status }
          : {}),
        ...paginationFromQuery(ctx.query)
      });
      return responder.list(contentTypes);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listDeletedContentTypes = async (ctx: HttpContext) => {
    try {
      const contentTypes = await this.contentTypes.listContentTypes({
        deleted: true,
        ...paginationFromQuery(ctx.query)
      });
      return responder.list(contentTypes);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getContentType = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing content type id");
    try {
      const contentType = await this.contentTypes.getContentType(ctx.params.id);
      return contentType
        ? responder.success(contentType)
        : responder.notFound(`Content type "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private createContentType = async (ctx: HttpContext) => {
    try {
      const input = CreateContentTypeInputSchema.parse(ctx.body);
      return responder.success(
        await this.contentTypes.createContentType(input, getAuthenticatedUser(ctx).id)
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updateContentType = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing content type id");
    try {
      const input = UpdateContentTypeInputSchema.parse(ctx.body);
      const updated = await this.contentTypes.updateContentType(ctx.params.id, input);
      return updated
        ? responder.success(updated)
        : responder.notFound(`Content type "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private deleteContentType = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing content type id");
    try {
      const deleted = await this.contentTypes.deleteContentType(ctx.params.id);
      return deleted
        ? responder.success(deleted)
        : responder.notFound(`Content type "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private restoreContentType = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing content type id");
    try {
      const restored = await this.contentTypes.restoreContentType(ctx.params.id);
      return restored
        ? responder.success(restored)
        : responder.notFound(`Deleted content type "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private permanentlyDeleteContentType = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing content type id");
    try {
      const deleted = await this.contentTypes.permanentlyDeleteContentType(ctx.params.id);
      return deleted
        ? responder.success({ id: ctx.params.id, permanentlyDeleted: true })
        : responder.notFound(`Deleted content type "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}

function paginationFromQuery(query: Record<string, string | string[]>) {
  const limit = parseQueryNumber(query.limit);
  const offset = parseQueryNumber(query.offset);

  return {
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {})
  };
}

function createEditorialPermissionMiddleware(
  authz: AuthzService,
  resource: string,
  action: string
): HttpMiddleware {
  return async (ctx, next) => {
    const user = getAuthenticatedUser(ctx);
    const decision = await authz.can({
      subjectId: user.id,
      resource,
      action,
      context: { pluginId: EDITORIAL_PACK_PLUGIN_ID }
    });
    if (!decision.allowed) {
      return response(
        apiError(
          "editorial_access_denied",
          decision.reason ?? "Editorial permission denied",
          undefined,
          {
            pluginId: EDITORIAL_PACK_PLUGIN_ID
          }
        ),
        { status: 403 }
      );
    }
    return next();
  };
}
