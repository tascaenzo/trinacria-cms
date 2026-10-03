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
import { getHttpOperationContext } from "@trinacria-cms/kernel/runtime";
import type { ContentTypeOperations } from "../../operations/content-type-operations.js";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../plugin/editorial-pack.constants.js";
import { editorialPaginationFromQuery } from "../editorial-pagination.js";
import {
  EditorialPaginationParameters,
  EditorialResponses,
  editorialRouteDocs
} from "../http/editorial-api.schemas.js";
import {
  CreateContentTypeInputSchema,
  UpdateContentTypeInputSchema
} from "./content-types.input.js";

const responder = createPluginApiResponder(EDITORIAL_PACK_PLUGIN_ID);

export class ContentTypesController extends HttpController {
  private readonly authenticated: HttpMiddleware;
  private readonly canRead: HttpMiddleware;
  private readonly canManage: HttpMiddleware;

  constructor(
    private readonly contentTypes: ContentTypeOperations,
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
        docs: editorialRouteDocs(
          "listEditorialContentTypes",
          EditorialResponses.contentTypes,
          undefined,
          [
            ...EditorialPaginationParameters,
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["active", "archived"] }
            }
          ]
        ),
        middlewares: [this.authenticated, this.canRead]
      })
      .get("/v1/editorial/content-types/deleted", this.listDeletedContentTypes, {
        docs: editorialRouteDocs(
          "listDeletedEditorialContentTypes",
          EditorialResponses.contentTypes,
          undefined,
          EditorialPaginationParameters
        ),
        middlewares: [this.authenticated, this.canManage]
      })
      .get("/v1/editorial/content-types/:id", this.getContentType, {
        docs: editorialRouteDocs("getEditorialContentType", EditorialResponses.contentType),
        middlewares: [this.authenticated, this.canRead]
      })
      .post("/v1/editorial/content-types", this.createContentType, {
        docs: editorialRouteDocs(
          "createEditorialContentType",
          EditorialResponses.contentType,
          CreateContentTypeInputSchema
        ),
        middlewares: [this.authenticated, this.canManage]
      })
      .patch("/v1/editorial/content-types/:id", this.updateContentType, {
        docs: editorialRouteDocs(
          "updateEditorialContentType",
          EditorialResponses.contentType,
          UpdateContentTypeInputSchema
        ),
        middlewares: [this.authenticated, this.canManage]
      })
      .post("/v1/editorial/content-types/:id/restore", this.restoreContentType, {
        docs: editorialRouteDocs("restoreEditorialContentType", EditorialResponses.contentType),
        middlewares: [this.authenticated, this.canManage]
      })
      .delete("/v1/editorial/content-types/:id/permanent", this.permanentlyDeleteContentType, {
        docs: editorialRouteDocs(
          "permanentlyDeleteEditorialContentType",
          EditorialResponses.permanent
        ),
        middlewares: [this.authenticated, this.canManage]
      })
      .delete("/v1/editorial/content-types/:id", this.deleteContentType, {
        docs: editorialRouteDocs("deleteEditorialContentType", EditorialResponses.contentType),
        middlewares: [this.authenticated, this.canManage]
      })
      .build();
  }

  private listContentTypes = async (ctx: HttpContext) => {
    try {
      const contentTypes = await this.contentTypes.listContentTypes(getHttpOperationContext(ctx), {
        ...(ctx.query.status === "active" || ctx.query.status === "archived"
          ? { status: ctx.query.status }
          : {}),
        ...editorialPaginationFromQuery(ctx.query)
      });
      return responder.list(contentTypes);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listDeletedContentTypes = async (ctx: HttpContext) => {
    try {
      const contentTypes = await this.contentTypes.listContentTypes(getHttpOperationContext(ctx), {
        deleted: true,
        ...editorialPaginationFromQuery(ctx.query)
      });
      return responder.list(contentTypes);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getContentType = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing content type id");
    try {
      const contentType = await this.contentTypes.getContentType(
        getHttpOperationContext(ctx),
        ctx.params.id
      );
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
        await this.contentTypes.createContentType(getHttpOperationContext(ctx), input)
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updateContentType = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing content type id");
    try {
      const input = UpdateContentTypeInputSchema.parse(ctx.body);
      const updated = await this.contentTypes.updateContentType(
        getHttpOperationContext(ctx),
        ctx.params.id,
        input
      );
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
      const deleted = await this.contentTypes.deleteContentType(
        getHttpOperationContext(ctx),
        ctx.params.id
      );
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
      const restored = await this.contentTypes.restoreContentType(
        getHttpOperationContext(ctx),
        ctx.params.id
      );
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
      const deleted = await this.contentTypes.permanentlyDeleteContentType(
        getHttpOperationContext(ctx),
        ctx.params.id
      );
      return deleted
        ? responder.success({ id: ctx.params.id, permanentlyDeleted: true })
        : responder.notFound(`Deleted content type "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
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
