import {
  createPluginApiResponder,
  HttpController,
  parsePathParam,
  toOpenApiSchema,
  type HttpContext,
  type HttpMiddleware,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { CORE_PACK_OPENAPI_TAGS } from "../../openapi-tags.js";
import { createJwtAuthMiddleware } from "../../auth/auth.middleware.js";
import type { JwtAuthService } from "../../auth/auth.service.js";
import {
  AssignUserRoleInputSchema,
  UserAccessErrorResponseSchema,
  UserEffectivePermissionsResponseSchema,
  UserRoleAssignmentResponseSchema,
  UserRoleAssignmentsResponseSchema,
} from "../dto/index.js";
import type { UserAccessService } from "./user-access.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

/**
 * Public REST API for user-role assignments and effective permissions.
 */
export class UserAccessController extends HttpController {
  private readonly adminAuthMiddleware: HttpMiddleware;

  constructor(
    private readonly access: UserAccessService,
    auth: JwtAuthService,
  ) {
    super();
    this.adminAuthMiddleware = createJwtAuthMiddleware(auth, {
      requireAdmin: true,
    });
  }

  routes() {
    return this.router()
      .get("/v1/users/:id/roles", this.listUserRoles, this.adminAuthMiddleware, {
        docs: {
          summary: "List role assignments for a user",
          tags: [CORE_PACK_OPENAPI_TAGS.SECURITY],
          operationId: "listUserRoles",
          responses: {
            200: {
              description: "User role assignments",
              schema: toOpenApiSchema(UserRoleAssignmentsResponseSchema),
            },
            404: {
              description: "User not found",
              schema: toOpenApiSchema(UserAccessErrorResponseSchema),
            },
          },
        },
      })
      .post(
        "/v1/users/:id/roles",
        this.assignUserRole,
        this.adminAuthMiddleware,
        {
        docs: {
          summary: "Assign a role to a user",
          tags: [CORE_PACK_OPENAPI_TAGS.SECURITY],
          operationId: "assignUserRole",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(AssignUserRoleInputSchema),
          },
          responses: {
            200: {
              description: "Role assigned",
              schema: toOpenApiSchema(UserRoleAssignmentResponseSchema),
            },
            404: {
              description: "User or role not found",
              schema: toOpenApiSchema(UserAccessErrorResponseSchema),
            },
          },
        },
      },
      )
      .delete(
        "/v1/users/:id/roles/:roleCode",
        this.removeUserRole,
        this.adminAuthMiddleware,
        {
        docs: {
          summary: "Remove a role from a user",
          tags: [CORE_PACK_OPENAPI_TAGS.SECURITY],
          operationId: "removeUserRole",
          responses: {
            200: {
              description: "Removed assignment list",
              schema: toOpenApiSchema(UserRoleAssignmentsResponseSchema),
            },
            404: {
              description: "Assignment not found",
              schema: toOpenApiSchema(UserAccessErrorResponseSchema),
            },
          },
        },
      },
      )
      .get(
        "/v1/users/:id/permissions",
        this.listUserEffectivePermissions,
        this.adminAuthMiddleware,
        {
        docs: {
          summary: "List effective permissions for a user",
          tags: [CORE_PACK_OPENAPI_TAGS.SECURITY],
          operationId: "listUserEffectivePermissions",
          responses: {
            200: {
              description: "Effective permissions",
              schema: toOpenApiSchema(UserEffectivePermissionsResponseSchema),
            },
            404: {
              description: "User not found",
              schema: toOpenApiSchema(UserAccessErrorResponseSchema),
            },
          },
        },
      },
      )
      .build();
  }

  private listUserRoles = async (ctx: HttpContext) => {
    const userId = parsePathParam(ctx.params, "id");
    if (!userId) {
      return responder.invalidRequest("Missing user id");
    }

    try {
      const assignments = await this.access.listUserRoles(userId);
      return responder.list(assignments);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private assignUserRole = async (ctx: HttpContext) => {
    const userId = parsePathParam(ctx.params, "id");
    if (!userId) {
      return responder.invalidRequest("Missing user id");
    }

    try {
      const payload = AssignUserRoleInputSchema.parse(ctx.body);
      const assignment = await this.access.assignRoleToUser(userId, payload.roleCode);
      return responder.success(assignment);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private removeUserRole = async (ctx: HttpContext) => {
    const userId = parsePathParam(ctx.params, "id");
    const roleCode = parsePathParam(ctx.params, "roleCode");

    if (!userId) {
      return responder.invalidRequest("Missing user id");
    }
    if (!roleCode) {
      return responder.invalidRequest("Missing role code");
    }

    try {
      const removed = await this.access.removeRoleFromUser(userId, roleCode);
      if (!removed) {
        return responder.notFound(
          `Role assignment "${roleCode}" for user "${userId}" not found`,
        );
      }
      const assignments = await this.access.listUserRoles(userId);
      return responder.list(assignments);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private listUserEffectivePermissions = async (ctx: HttpContext) => {
    const userId = parsePathParam(ctx.params, "id");
    if (!userId) {
      return responder.invalidRequest("Missing user id");
    }

    try {
      const permissions = await this.access.resolveUserPermissions(userId);
      return responder.list(permissions);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
