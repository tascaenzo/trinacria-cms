import {
  createPluginApiResponder,
  HttpController,
  parseQueryNumber,
  toOpenApiSchema,
  type HttpContext,
  type HttpMiddleware
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { CORE_PACK_OPENAPI_TAGS } from "../openapi-tags.js";
import { createJwtAuthMiddleware } from "../auth/auth.middleware.js";
import type { JwtAuthService } from "../auth/services/auth.service.js";
import {
  CreateRoleInputSchema,
  ListRolesQuerySchema,
  ListRolesResponseSchema,
  RoleResponseSchema,
  RolesErrorResponseSchema,
  UpdateRoleInputSchema,
  UpdateRoleStatusInputSchema
} from "./dto/index.js";
import type { RolesService } from "./roles.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

const RolesListQueryParameters = [
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
] as const;

/**
 * Public REST API for core-pack roles (`/v1/roles`).
 */
export class RolesController extends HttpController {
  private readonly adminAuthMiddleware: HttpMiddleware;

  constructor(
    private readonly roles: RolesService,
    auth: JwtAuthService
  ) {
    super();
    this.adminAuthMiddleware = createJwtAuthMiddleware(auth, {
      requireAdmin: true
    });
  }

  routes() {
    return this.router()
      .get("/v1/roles", this.listRoles, {
        middlewares: [this.adminAuthMiddleware],
        docs: {
          summary: "List roles",
          tags: [CORE_PACK_OPENAPI_TAGS.ROLES],
          operationId: "listRoles",
          security: [{ bearerAuth: [] }],
          parameters: [...RolesListQueryParameters],
          responses: {
            200: {
              description: "Roles list",
              schema: toOpenApiSchema(ListRolesResponseSchema)
            }
          }
        }
      })
      .get("/v1/roles/:id", this.getRoleById, {
        middlewares: [this.adminAuthMiddleware],
        docs: {
          summary: "Get role by id",
          tags: [CORE_PACK_OPENAPI_TAGS.ROLES],
          operationId: "getRoleById",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Role found",
              schema: toOpenApiSchema(RoleResponseSchema)
            },
            404: {
              description: "Role not found",
              schema: toOpenApiSchema(RolesErrorResponseSchema)
            }
          }
        }
      })
      .post("/v1/roles", this.createRole, {
        middlewares: [this.adminAuthMiddleware],
        docs: {
          summary: "Create role",
          tags: [CORE_PACK_OPENAPI_TAGS.ROLES],
          operationId: "createRole",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            schema: toOpenApiSchema(CreateRoleInputSchema)
          },
          responses: {
            200: {
              description: "Role created",
              schema: toOpenApiSchema(RoleResponseSchema)
            },
            409: {
              description: "Conflict",
              schema: toOpenApiSchema(RolesErrorResponseSchema)
            }
          }
        }
      })
      .patch("/v1/roles/:id", this.updateRole, {
        middlewares: [this.adminAuthMiddleware],
        docs: {
          summary: "Update role",
          tags: [CORE_PACK_OPENAPI_TAGS.ROLES],
          operationId: "updateRole",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            schema: toOpenApiSchema(UpdateRoleInputSchema)
          },
          responses: {
            200: {
              description: "Role updated",
              schema: toOpenApiSchema(RoleResponseSchema)
            },
            404: {
              description: "Role not found",
              schema: toOpenApiSchema(RolesErrorResponseSchema)
            }
          }
        }
      })
      .patch("/v1/roles/:id/status", this.updateRoleStatus, {
        middlewares: [this.adminAuthMiddleware],
        docs: {
          summary: "Update role status",
          tags: [CORE_PACK_OPENAPI_TAGS.ROLES],
          operationId: "updateRoleStatus",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            schema: toOpenApiSchema(UpdateRoleStatusInputSchema)
          },
          responses: {
            200: {
              description: "Role updated",
              schema: toOpenApiSchema(RoleResponseSchema)
            },
            404: {
              description: "Role not found",
              schema: toOpenApiSchema(RolesErrorResponseSchema)
            }
          }
        }
      })
      .build();
  }

  private listRoles = async (ctx: HttpContext) => {
    try {
      const query = ListRolesQuerySchema.parse({
        limit: parseQueryNumber(ctx.query.limit),
        offset: parseQueryNumber(ctx.query.offset)
      });
      const roles = await this.roles.listRoles(query);
      return responder.list(roles, {
        limit: query.limit,
        offset: query.offset
      });
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getRoleById = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) {
      return responder.invalidRequest("Missing role id");
    }

    try {
      const role = await this.roles.getRoleById(id);
      if (!role) {
        return responder.notFound(`Role "${id}" not found`);
      }
      return responder.success(role);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private createRole = async (ctx: HttpContext) => {
    try {
      const payload = CreateRoleInputSchema.parse(ctx.body);
      const created = await this.roles.createRole(payload);
      return responder.success(created);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updateRole = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) {
      return responder.invalidRequest("Missing role id");
    }

    try {
      const payload = UpdateRoleInputSchema.parse(ctx.body);
      const updated = await this.roles.updateRole(id, payload);
      if (!updated) {
        return responder.notFound(`Role "${id}" not found`);
      }
      return responder.success(updated);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updateRoleStatus = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) {
      return responder.invalidRequest("Missing role id");
    }

    try {
      const payload = UpdateRoleStatusInputSchema.parse(ctx.body);
      const updated =
        payload.status === "active"
          ? await this.roles.activateRole(id)
          : await this.roles.disableRole(id);
      if (!updated) {
        return responder.notFound(`Role "${id}" not found`);
      }
      return responder.success(updated);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
