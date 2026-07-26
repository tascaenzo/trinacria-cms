import {
  createJwtAuthMiddleware,
  getAuthenticatedUser,
  type JwtAuthService
} from "@trinacria-cms/core-pack";
import {
  type AuthzService,
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  type HttpMiddleware,
  parseQueryNumber
} from "@trinacria-cms/kernel";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../plugin/editorial-pack.constants.js";
import {
  CreateEntryInputSchema,
  TransitionEntryInputSchema,
  UpdateEntryInputSchema
} from "./entries.input.js";
import type {
  EditorialTransition,
  EntriesService,
  EntryAccessScope
} from "./services/entries.service.js";

const responder = createPluginApiResponder(EDITORIAL_PACK_PLUGIN_ID);

export class EntriesController extends HttpController {
  private readonly authenticated: HttpMiddleware;

  constructor(
    private readonly entries: EntriesService,
    auth: JwtAuthService,
    private readonly authz: AuthzService
  ) {
    super();
    this.authenticated = createJwtAuthMiddleware(auth, { requireAdmin: false });
  }

  routes() {
    return this.router()
      .get("/v1/editorial/entries", this.listEntries, { middlewares: [this.authenticated] })
      .get("/v1/editorial/entries/:id", this.getEntry, { middlewares: [this.authenticated] })
      .post("/v1/editorial/entries", this.createEntry, { middlewares: [this.authenticated] })
      .patch("/v1/editorial/entries/:id", this.updateEntry, { middlewares: [this.authenticated] })
      .delete("/v1/editorial/entries/:id", this.deleteEntry, { middlewares: [this.authenticated] })
      .post("/v1/editorial/entries/:id/submit", this.submitEntry, {
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/approve", this.approveEntry, {
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/request-changes", this.requestChanges, {
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/publish", this.publishEntry, {
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/unpublish", this.unpublishEntry, {
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/transition", this.transitionEntry, {
        middlewares: [this.authenticated]
      })
      .get("/v1/editorial/entries/:id/revisions", this.listRevisions, {
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/revisions/:revisionId/restore", this.restoreRevision, {
        middlewares: [this.authenticated]
      })
      .build();
  }

  private listEntries = async (ctx: HttpContext) => {
    try {
      await this.require(ctx, "read");
      const entries = await this.entries.listEntries(
        {
          ...(typeof ctx.query.contentTypeId === "string"
            ? { contentTypeId: ctx.query.contentTypeId }
            : {}),
          ...(typeof ctx.query.ownerUserId === "string"
            ? { ownerUserId: ctx.query.ownerUserId }
            : {}),
          ...(typeof ctx.query.reviewerUserId === "string"
            ? { reviewerUserId: ctx.query.reviewerUserId }
            : {}),
          ...(typeof ctx.query.status === "string" ? { status: ctx.query.status } : {}),
          ...(parseQueryNumber(ctx.query.limit) !== undefined
            ? { limit: parseQueryNumber(ctx.query.limit) }
            : {}),
          ...(parseQueryNumber(ctx.query.offset) !== undefined
            ? { offset: parseQueryNumber(ctx.query.offset) }
            : {})
        },
        await this.scope(ctx)
      );
      return responder.list(entries);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getEntry = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing entry id");
    try {
      await this.require(ctx, "read");
      const entry = await this.entries.getEntry(ctx.params.id, await this.scope(ctx));
      return entry
        ? responder.success(entry)
        : responder.notFound(`Entry "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private createEntry = async (ctx: HttpContext) => {
    try {
      await this.require(ctx, "create");
      const input = CreateEntryInputSchema.parse(ctx.body);
      return responder.success(await this.entries.createEntry(input, getAuthenticatedUser(ctx).id));
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updateEntry = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing entry id");
    try {
      await this.require(ctx, "update");
      const input = UpdateEntryInputSchema.parse(ctx.body);
      const updated = await this.entries.updateEntry(ctx.params.id, input, await this.scope(ctx));
      return updated
        ? responder.success(updated)
        : responder.notFound(`Entry "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private deleteEntry = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing entry id");
    try {
      await this.require(ctx, "delete");
      return responder.success({
        deleted: await this.entries.deleteEntry(ctx.params.id, await this.scope(ctx))
      });
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private submitEntry = async (ctx: HttpContext) => this.transition(ctx, "submit");
  private approveEntry = async (ctx: HttpContext) => this.transition(ctx, "approve");
  private requestChanges = async (ctx: HttpContext) => this.transition(ctx, "request_changes");
  private publishEntry = async (ctx: HttpContext) => this.transition(ctx, "publish");
  private unpublishEntry = async (ctx: HttpContext) => this.transition(ctx, "unpublish");

  private transitionEntry = async (ctx: HttpContext) => {
    try {
      const input = TransitionEntryInputSchema.parse(ctx.body);
      return this.transition(ctx, input.transitionId);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listRevisions = async (ctx: HttpContext) => {
    if (!ctx.params.id) return responder.invalidRequest("Missing entry id");
    try {
      await this.require(ctx, "read");
      const revisions = await this.entries.listRevisions(ctx.params.id, await this.scope(ctx));
      return revisions
        ? responder.list(revisions)
        : responder.notFound(`Entry "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private restoreRevision = async (ctx: HttpContext) => {
    if (!ctx.params.id || !ctx.params.revisionId)
      return responder.invalidRequest("Missing revision reference");
    try {
      await this.require(ctx, "restore", "revisions");
      const restored = await this.entries.restoreRevision(
        ctx.params.id,
        ctx.params.revisionId,
        await this.scope(ctx)
      );
      return restored
        ? responder.success(restored)
        : responder.notFound(`Entry "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private async transition(ctx: HttpContext, transition: EditorialTransition) {
    if (!ctx.params.id) return responder.invalidRequest("Missing entry id");
    try {
      const action = await this.entries.getTransitionPermission(ctx.params.id, transition);
      if (!action) return responder.invalidRequest(`Transition "${transition}" is not available`);
      await this.require(ctx, action);
      const updated = await this.entries.transitionEntry(
        ctx.params.id,
        transition,
        await this.scope(ctx)
      );
      return updated
        ? responder.success(updated)
        : responder.notFound(`Entry "${ctx.params.id}" not found`);
    } catch (error) {
      return responder.fromError(error);
    }
  }

  private async scope(ctx: HttpContext): Promise<EntryAccessScope> {
    const user = getAuthenticatedUser(ctx);
    const elevated = await Promise.all(
      ["delete", "review", "approve", "publish"].map((action) => this.can(user.id, action))
    );
    return { actorUserId: user.id, canAccessAll: elevated.some(Boolean) };
  }

  private async require(ctx: HttpContext, action: string, resource = "entries") {
    const user = getAuthenticatedUser(ctx);
    if (await this.can(user.id, action, resource)) return;
    throw Object.assign(new Error("Editorial permission denied"), {
      code: "auth_forbidden_admin_required"
    });
  }

  private async can(subjectId: string, action: string, resource = "entries") {
    return (
      await this.authz.can({
        subjectId,
        resource,
        action,
        context: { pluginId: EDITORIAL_PACK_PLUGIN_ID }
      })
    ).allowed;
  }
}
