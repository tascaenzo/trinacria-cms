import {
  createPluginApiResponder,
  HttpController,
  parseQueryNumber,
  toOpenApiSchema,
  type HttpContext,
  type HttpMiddleware,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { CORE_PACK_OPENAPI_TAGS } from "../openapi-tags.js";
import { createJwtAuthMiddleware } from "../auth/auth.middleware.js";
import type { JwtAuthService } from "../auth/auth.service.js";
import {
  CreatePermissionInputSchema,
  ListPermissionsQuerySchema,
  ListPermissionsResponseSchema,
  PermissionResponseSchema,
  PermissionsErrorResponseSchema,
  UpdatePermissionStatusInputSchema,
} from "./dto/index.js";
import type { PermissionsService } from "./permissions.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

/**
 * Public REST API for core-pack permissions (`/v1/permissions`).
 */
export class PermissionsController extends HttpController {
  private readonly adminAuthMiddleware: HttpMiddleware;

  constructor(
    private readonly permissions: PermissionsService,
    auth: JwtAuthService,
  ) {
    super();
    this.adminAuthMiddleware = createJwtAuthMiddleware(auth, {
      requireAdmin: true,
    });
  }

  routes() {
    return this.router()
      .get(
        "/v1/permissions",
        this.listPermissions,
        this.adminAuthMiddleware,
        {
        docs: {
          summary: "List permissions",
          tags: [CORE_PACK_OPENAPI_TAGS.PERMISSIONS],
          operationId: "listPermissions",
          responses: {
            200: {
              description: "Permissions list",
              schema: toOpenApiSchema(ListPermissionsResponseSchema),
            },
          },
        },
      },
      )
      .get(
        "/v1/permissions/:id",
        this.getPermissionById,
        this.adminAuthMiddleware,
        {
        docs: {
          summary: "Get permission by id",
          tags: [CORE_PACK_OPENAPI_TAGS.PERMISSIONS],
          operationId: "getPermissionById",
          responses: {
            200: {
              description: "Permission found",
              schema: toOpenApiSchema(PermissionResponseSchema),
            },
            404: {
              description: "Permission not found",
              schema: toOpenApiSchema(PermissionsErrorResponseSchema),
            },
          },
        },
      },
      )
      .post(
        "/v1/permissions",
        this.createPermission,
        this.adminAuthMiddleware,
        {
        docs: {
          summary: "Create permission",
          tags: [CORE_PACK_OPENAPI_TAGS.PERMISSIONS],
          operationId: "createPermission",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(CreatePermissionInputSchema),
          },
          responses: {
            200: {
              description: "Permission created",
              schema: toOpenApiSchema(PermissionResponseSchema),
            },
            409: {
              description: "Conflict",
              schema: toOpenApiSchema(PermissionsErrorResponseSchema),
            },
          },
        },
      },
      )
      .patch(
        "/v1/permissions/:id/status",
        this.updatePermissionStatus,
        this.adminAuthMiddleware,
        {
        docs: {
          summary: "Update permission status",
          tags: [CORE_PACK_OPENAPI_TAGS.PERMISSIONS],
          operationId: "updatePermissionStatus",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(UpdatePermissionStatusInputSchema),
          },
          responses: {
            200: {
              description: "Permission updated",
              schema: toOpenApiSchema(PermissionResponseSchema),
            },
            404: {
              description: "Permission not found",
              schema: toOpenApiSchema(PermissionsErrorResponseSchema),
            },
          },
        },
      },
      )
      .build();
  }

  private listPermissions = async (ctx: HttpContext) => {
    try {
      const query = ListPermissionsQuerySchema.parse({
        limit: parseQueryNumber(ctx.query.limit),
        offset: parseQueryNumber(ctx.query.offset),
      });
      const permissions = await this.permissions.listPermissions(query);
      return responder.list(permissions, {
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getPermissionById = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) {
      return responder.invalidRequest("Missing permission id");
    }

    try {
      const permission = await this.permissions.getPermissionById(id);
      if (!permission) {
        return responder.notFound(`Permission "${id}" not found`);
      }
      return responder.success(permission);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private createPermission = async (ctx: HttpContext) => {
    try {
      const payload = CreatePermissionInputSchema.parse(ctx.body);
      const created = await this.permissions.createPermission(payload);
      return responder.success(created);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updatePermissionStatus = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) {
      return responder.invalidRequest("Missing permission id");
    }

    try {
      const payload = UpdatePermissionStatusInputSchema.parse(ctx.body);
      const updated =
        payload.status === "active"
          ? await this.permissions.activatePermission(id)
          : await this.permissions.disablePermission(id);
      if (!updated) {
        return responder.notFound(`Permission "${id}" not found`);
      }
      return responder.success(updated);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
