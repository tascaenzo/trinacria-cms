import { createJwtAuthMiddleware, type JwtAuthService } from "@trinacria-cms/core-pack";
import {
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  type HttpMiddleware,
  parseQueryNumber,
  s
} from "@trinacria-cms/kernel";
import { getHttpOperationContext } from "@trinacria-cms/kernel/runtime";
import type { EditorialEntryOperations } from "../../operations/editorial-entry-operations.js";
import { EDITORIAL_PACK_PLUGIN_ID } from "../../plugin/editorial-pack.constants.js";
import { editorialPaginationFromQuery } from "../editorial-pagination.js";
import {
  EditorialPaginationParameters,
  EditorialResponses,
  editorialRouteDocs
} from "../http/editorial-api.schemas.js";
import {
  CreateEntryInputSchema,
  TransitionEntryInputSchema,
  UpdateEntryInputSchema
} from "./entries.input.js";

const responder = createPluginApiResponder(EDITORIAL_PACK_PLUGIN_ID);
export class EntriesController extends HttpController {
  private readonly authenticated: HttpMiddleware;
  constructor(
    private readonly entries: EditorialEntryOperations,
    auth: JwtAuthService
  ) {
    super();
    this.authenticated = createJwtAuthMiddleware(auth, { requireAdmin: false });
  }
  routes() {
    return this.router()
      .get("/v1/editorial/entries", this.listEntries, {
        docs: editorialRouteDocs("listEditorialEntries", EditorialResponses.entries, undefined, [
          ...EditorialPaginationParameters,
          ...["contentTypeId", "ownerUserId", "reviewerUserId", "status"].map((name) => ({
            name,
            in: "query" as const,
            schema: { type: "string" }
          }))
        ]),
        middlewares: [this.authenticated]
      })
      .get("/v1/editorial/entries/:id", this.getEntry, {
        docs: editorialRouteDocs("getEditorialEntry", EditorialResponses.entry),
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries", this.createEntry, {
        docs: editorialRouteDocs(
          "createEditorialEntry",
          EditorialResponses.entry,
          CreateEntryInputSchema
        ),
        middlewares: [this.authenticated]
      })
      .patch("/v1/editorial/entries/:id", this.updateEntry, {
        docs: editorialRouteDocs(
          "updateEditorialEntry",
          EditorialResponses.entry,
          UpdateEntryInputSchema
        ),
        middlewares: [this.authenticated]
      })
      .delete("/v1/editorial/entries/:id", this.deleteEntry, {
        docs: editorialRouteDocs("deleteEditorialEntry", EditorialResponses.deleted),
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/submit", this.submitEntry, {
        docs: editorialRouteDocs("submitEditorialEntry", EditorialResponses.entry),
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/approve", this.approveEntry, {
        docs: editorialRouteDocs("approveEditorialEntry", EditorialResponses.entry),
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/request-changes", this.requestChanges, {
        docs: editorialRouteDocs("requestEditorialEntryChanges", EditorialResponses.entry),
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/publish", this.publishEntry, {
        docs: editorialRouteDocs("publishEditorialEntry", EditorialResponses.entry),
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/unpublish", this.unpublishEntry, {
        docs: editorialRouteDocs("unpublishEditorialEntry", EditorialResponses.entry),
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/publication", this.publishSnapshot, {
        docs: editorialRouteDocs(
          "publishEditorialEntrySnapshot",
          EditorialResponses.entry,
          s.object({ expectedVersion: s.number({ int: true, min: 1 }) }, { strict: true })
        ),
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/transition", this.transitionEntry, {
        docs: editorialRouteDocs(
          "transitionEditorialEntry",
          EditorialResponses.entry,
          TransitionEntryInputSchema
        ),
        middlewares: [this.authenticated]
      })
      .get("/v1/editorial/entries/:id/revisions", this.listRevisions, {
        docs: editorialRouteDocs("listEditorialEntryRevisions", EditorialResponses.revisions),
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/revisions", this.createRevisionSnapshot, {
        docs: editorialRouteDocs("createEditorialEntryRevision", EditorialResponses.entry),
        middlewares: [this.authenticated]
      })
      .post("/v1/editorial/entries/:id/revisions/:revisionId/restore", this.restoreRevision, {
        docs: editorialRouteDocs("restoreEditorialEntryRevision", EditorialResponses.entry),
        middlewares: [this.authenticated]
      })
      .build();
  }

  private publishSnapshot = async (ctx: HttpContext) => {
    try {
      const { expectedVersion } = s
        .object({ expectedVersion: s.number({ int: true, min: 1 }) }, { strict: true })
        .parse(ctx.body);
      const entry = await this.entries.publishSnapshot(
        getHttpOperationContext(ctx),
        ctx.params.id!,
        expectedVersion
      );
      return entry ? responder.success(entry) : responder.notFound("Entry not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listEntries = async (ctx: HttpContext) => {
    try {
      return responder.list(
        await this.entries.listEntries(getHttpOperationContext(ctx), {
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
          ...editorialPaginationFromQuery(ctx.query)
        })
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };
  private getEntry = async (ctx: HttpContext) => {
    try {
      const entry = await this.entries.getEntry(getHttpOperationContext(ctx), ctx.params.id!);
      return entry ? responder.success(entry) : responder.notFound("Entry not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };
  private createEntry = async (ctx: HttpContext) => {
    try {
      return responder.success(
        await this.entries.createEntry(
          getHttpOperationContext(ctx),
          CreateEntryInputSchema.parse(ctx.body)
        )
      );
    } catch (error) {
      return responder.fromError(error);
    }
  };
  private updateEntry = async (ctx: HttpContext) => {
    try {
      const entry = await this.entries.updateEntry(
        getHttpOperationContext(ctx),
        ctx.params.id!,
        UpdateEntryInputSchema.parse(ctx.body)
      );
      return entry ? responder.success(entry) : responder.notFound("Entry not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };
  private deleteEntry = async (ctx: HttpContext) => {
    try {
      return responder.success({
        deleted: await this.entries.deleteEntry(getHttpOperationContext(ctx), ctx.params.id!)
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
      return this.transition(ctx, TransitionEntryInputSchema.parse(ctx.body).transitionId);
    } catch (error) {
      return responder.fromError(error);
    }
  };
  private async transition(ctx: HttpContext, transition: string) {
    try {
      const entry = await this.entries.transitionEntry(
        getHttpOperationContext(ctx),
        ctx.params.id!,
        transition
      );
      return entry ? responder.success(entry) : responder.notFound("Entry not found");
    } catch (error) {
      return responder.fromError(error);
    }
  }
  private listRevisions = async (ctx: HttpContext) => {
    try {
      const revisions = await this.entries.listRevisions(
        getHttpOperationContext(ctx),
        ctx.params.id!
      );
      return revisions ? responder.list(revisions) : responder.notFound("Entry not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };
  private createRevisionSnapshot = async (ctx: HttpContext) => {
    try {
      const entry = await this.entries.createRevisionSnapshot(
        getHttpOperationContext(ctx),
        ctx.params.id!
      );
      return entry ? responder.success(entry) : responder.notFound("Entry not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };
  private restoreRevision = async (ctx: HttpContext) => {
    try {
      const entry = await this.entries.restoreRevision(
        getHttpOperationContext(ctx),
        ctx.params.id!,
        ctx.params.revisionId!
      );
      return entry ? responder.success(entry) : responder.notFound("Entry not found");
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
