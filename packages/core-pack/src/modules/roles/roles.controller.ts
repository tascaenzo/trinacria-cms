import {
  createPluginApiResponder,
  HttpController,
  parseQueryNumber,
  toOpenApiSchema,
  type HttpContext,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import {
  CreateRoleInputSchema,
  ListRolesQuerySchema,
  ListRolesResponseSchema,
  RoleResponseSchema,
  RolesErrorResponseSchema,
  UpdateRoleStatusInputSchema,
} from "./dto/index.js";
import type { RolesService } from "./roles.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

/**
 * Public REST API for core-pack roles (`/v1/roles`).
 */
export class RolesController extends HttpController {
  constructor(private readonly roles: RolesService) {
    super();
  }

  routes() {
    return this.router()
      .get("/v1/roles", this.listRoles, {
        docs: {
          summary: "List roles",
          tags: ["Roles"],
          operationId: "listRoles",
          responses: {
            200: {
              description: "Roles list",
              schema: toOpenApiSchema(ListRolesResponseSchema),
            },
          },
        },
      })
      .get("/v1/roles/:id", this.getRoleById, {
        docs: {
          summary: "Get role by id",
          tags: ["Roles"],
          operationId: "getRoleById",
          responses: {
            200: {
              description: "Role found",
              schema: toOpenApiSchema(RoleResponseSchema),
            },
            404: {
              description: "Role not found",
              schema: toOpenApiSchema(RolesErrorResponseSchema),
            },
          },
        },
      })
      .post("/v1/roles", this.createRole, {
        docs: {
          summary: "Create role",
          tags: ["Roles"],
          operationId: "createRole",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(CreateRoleInputSchema),
          },
          responses: {
            200: {
              description: "Role created",
              schema: toOpenApiSchema(RoleResponseSchema),
            },
            409: {
              description: "Conflict",
              schema: toOpenApiSchema(RolesErrorResponseSchema),
            },
          },
        },
      })
      .patch("/v1/roles/:id/status", this.updateRoleStatus, {
        docs: {
          summary: "Update role status",
          tags: ["Roles"],
          operationId: "updateRoleStatus",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(UpdateRoleStatusInputSchema),
          },
          responses: {
            200: {
              description: "Role updated",
              schema: toOpenApiSchema(RoleResponseSchema),
            },
            404: {
              description: "Role not found",
              schema: toOpenApiSchema(RolesErrorResponseSchema),
            },
          },
        },
      })
      .build();
  }

  private listRoles = async (ctx: HttpContext) => {
    try {
      const query = ListRolesQuerySchema.parse({
        limit: parseQueryNumber(ctx.query.limit),
        offset: parseQueryNumber(ctx.query.offset),
      });
      const roles = await this.roles.listRoles(query);
      return responder.list(roles, {
        limit: query.limit,
        offset: query.offset,
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
