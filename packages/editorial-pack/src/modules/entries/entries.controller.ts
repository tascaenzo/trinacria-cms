import {
  apiError,
  createPluginApiResponder,
  HttpController,
  parseQueryNumber,
  response,
  type AuthzService,
  type HttpContext,
  type HttpMiddleware
} from "@trinacria-cms/kernel";
import {
  createJwtAuthMiddleware,
  getAuthenticatedUser,
  type JwtAuthService
} from "@trinacria-cms/core-pack";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../plugin/editorial-pack.constants.js";
import { CreateEntryInputSchema, UpdateEntryInputSchema } from "./entries.input.js";
import { EntriesService } from "./services/entries.service.js";

const responder = createPluginApiResponder(EDITORIAL_PACK_PLUGIN_ID);

export class EntriesController extends HttpController {
  private readonly authenticated: HttpMiddleware;
  private readonly canRead: HttpMiddleware;
  private readonly canCreate: HttpMiddleware;
  private readonly canUpdate: HttpMiddleware;

  constructor(
    private readonly entries: EntriesService,
    auth: JwtAuthService,
    authz: AuthzService
  ) {
    super();
    this.authenticated = createJwtAuthMiddleware(auth, { requireAdmin: false });
    this.canRead = createEntriesPermissionMiddleware(authz, "read");
    this.canCreate = createEntriesPermissionMiddleware(authz, "create");
    this.canUpdate = createEntriesPermissionMiddleware(authz, "update");
  }

  routes() {
    return this.router()
      .get("/v1/editorial/entries", this.listEntries, {
        middlewares: [this.authenticated, this.canRead]
      })
      .get("/v1/editorial/entries/:id", this.getEntry, {
        middlewares: [this.authenticated, this.canRead]
      })
      .post("/v1/editorial/entries", this.createEntry, {
        middlewares: [this.authenticated, this.canCreate]
      })
      .patch("/v1/editorial/entries/:id", this.updateEntry, {
        middlewares: [this.authenticated, this.canUpdate]
      })
      .build();
  }

  private listEntries = async (ctx: HttpContext) => {
    try {
      const entries = await this.entries.listEntries({
        ...(typeof ctx.query.contentTypeId === "string"
          ? { contentTypeId: ctx.query.contentTypeId }
          : {}),
        ...(typeof ctx.query.ownerUserId === "string"
          ? { ownerUserId: ctx.query.ownerUserId }
          : {}),
        ...(parseQueryNumber(ctx.query.limit) !== undefined
          ? { limit: parseQueryNumber(ctx.query.limit) }
          : {}),
        ...(parseQueryNumber(ctx.query.offset) !== undefined
          ? { offset: parseQueryNumber(ctx.query.offset) }
          : {})
      });
      return responder.list(entries);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getEntry = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing entry id");
    try {
      const entry = await this.entries.getEntry(ctx.params.id);
      return entry
        ? responder.success(entry)
        : responder.notFound(`Entry "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private createEntry = async (ctx: HttpContext) => {
    try {
      const input = CreateEntryInputSchema.parse(ctx.body);
      return responder.success(await this.entries.createEntry(input, getAuthenticatedUser(ctx).id));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updateEntry = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing entry id");
    try {
      const input = UpdateEntryInputSchema.parse(ctx.body);
      const updated = await this.entries.updateEntry(ctx.params.id, input);
      return updated
        ? responder.success(updated)
        : responder.notFound(`Entry "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}

function createEntriesPermissionMiddleware(authz: AuthzService, action: string): HttpMiddleware {
  return async (ctx, next) => {
    const user = getAuthenticatedUser(ctx);
    const decision = await authz.can({
      subjectId: user.id,
      resource: "entries",
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
