import {
  createPluginApiResponder,
  HttpController,
  parseQueryNumber,
  toOpenApiSchema,
  type HttpContext
} from "@trinacria-cms/kernel";
import {
  CreateUserInputSchema,
  ListUsersQuerySchema,
  ListUsersResponseSchema,
  UpdateUserStatusInputSchema,
  UserResponseSchema,
  UsersErrorResponseSchema,
} from "./dto/index.js";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import type { UsersService } from "./users.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

/**
 * Public REST API for core-pack users (`/v1/users`).
 */
export class UsersController extends HttpController {
  constructor(private readonly users: UsersService) {
    super();
  }

  routes() {
    return this.router()
      .get("/v1/users", this.listUsers, {
        docs: {
          summary: "List users",
          tags: ["Users"],
          operationId: "listUsers",
          responses: {
            200: {
              description: "Users list",
              schema: toOpenApiSchema(ListUsersResponseSchema)
            }
          }
        }
      })
      .get("/v1/users/:id", this.getUserById, {
        docs: {
          summary: "Get user by id",
          tags: ["Users"],
          operationId: "getUserById",
          responses: {
            200: {
              description: "User found",
              schema: toOpenApiSchema(UserResponseSchema)
            },
            404: {
              description: "User not found",
              schema: toOpenApiSchema(UsersErrorResponseSchema)
            }
          }
        }
      })
      .post("/v1/users", this.createUser, {
        docs: {
          summary: "Create user",
          tags: ["Users"],
          operationId: "createUser",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(CreateUserInputSchema)
          },
          responses: {
            200: {
              description: "User created",
              schema: toOpenApiSchema(UserResponseSchema)
            },
            409: {
              description: "Conflict",
              schema: toOpenApiSchema(UsersErrorResponseSchema)
            }
          }
        }
      })
      .patch("/v1/users/:id/status", this.updateUserStatus, {
        docs: {
          summary: "Update user status",
          tags: ["Users"],
          operationId: "updateUserStatus",
          requestBody: {
            required: true,
            schema: toOpenApiSchema(UpdateUserStatusInputSchema)
          },
          responses: {
            200: {
              description: "User updated",
              schema: toOpenApiSchema(UserResponseSchema)
            },
            404: {
              description: "User not found",
              schema: toOpenApiSchema(UsersErrorResponseSchema)
            }
          }
        }
      })
      .build();
  }

  private listUsers = async (ctx: HttpContext) => {
    try {
      const query = ListUsersQuerySchema.parse({
        limit: parseQueryNumber(ctx.query.limit),
        offset: parseQueryNumber(ctx.query.offset)
      });
      const users = await this.users.listUsers(query);
      return responder.list(users, {
        limit: query.limit,
        offset: query.offset
      });
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getUserById = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) {
      return responder.invalidRequest("Missing user id");
    }

    try {
      const user = await this.users.getUserById(id);
      if (!user) {
        return responder.notFound(`User "${id}" not found`);
      }
      return responder.success(user);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private createUser = async (ctx: HttpContext) => {
    try {
      const payload = CreateUserInputSchema.parse(ctx.body);
      const created = await this.users.createUser(payload);
      return responder.success(created);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updateUserStatus = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) {
      return responder.invalidRequest("Missing user id");
    }

    try {
      const payload = UpdateUserStatusInputSchema.parse(ctx.body);
      const updated =
        payload.status === "active"
          ? await this.users.activateUser(id)
          : await this.users.suspendUser(id);
      if (!updated) {
        return responder.notFound(`User "${id}" not found`);
      }
      return responder.success(updated);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
