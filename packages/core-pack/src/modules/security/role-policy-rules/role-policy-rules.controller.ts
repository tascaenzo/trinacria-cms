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
  CreateRolePolicyRuleInputSchema,
  ListRolePolicyRulesResponseSchema,
  RolePolicyRuleResponseSchema,
  RolePolicyRulesErrorResponseSchema,
  UpdateRolePolicyRuleInputSchema,
} from "../dto/index.js";
import type { RolePolicyRulesService } from "./role-policy-rules.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

/**
 * Public REST API for role policy rule CRUD operations.
 */
export class RolePolicyRulesController extends HttpController {
  private readonly adminAuthMiddleware: HttpMiddleware;

  constructor(
    private readonly rules: RolePolicyRulesService,
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
        "/v1/roles/:roleCode/policy-rules",
        this.listRolePolicyRules,
        {
          middlewares: [this.adminAuthMiddleware],
          docs: {
            summary: "List policy rules for a role",
            tags: [CORE_PACK_OPENAPI_TAGS.SECURITY],
            operationId: "listRolePolicyRules",
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: "Role policy rules list",
                schema: toOpenApiSchema(ListRolePolicyRulesResponseSchema),
              },
              404: {
                description: "Role not found",
                schema: toOpenApiSchema(RolePolicyRulesErrorResponseSchema),
              },
            },
          },
        },
      )
      .post(
        "/v1/roles/:roleCode/policy-rules",
        this.createRolePolicyRule,
        {
          middlewares: [this.adminAuthMiddleware],
          docs: {
            summary: "Create policy rule for a role",
            tags: [CORE_PACK_OPENAPI_TAGS.SECURITY],
            operationId: "createRolePolicyRule",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              schema: toOpenApiSchema(CreateRolePolicyRuleInputSchema),
            },
            responses: {
              200: {
                description: "Role policy rule created",
                schema: toOpenApiSchema(RolePolicyRuleResponseSchema),
              },
              404: {
                description: "Role not found",
                schema: toOpenApiSchema(RolePolicyRulesErrorResponseSchema),
              },
              409: {
                description: "Rule conflict",
                schema: toOpenApiSchema(RolePolicyRulesErrorResponseSchema),
              },
            },
          },
        },
      )
      .patch(
        "/v1/roles/:roleCode/policy-rules/:ruleId",
        this.updateRolePolicyRule,
        {
          middlewares: [this.adminAuthMiddleware],
          docs: {
            summary: "Update a role policy rule",
            tags: [CORE_PACK_OPENAPI_TAGS.SECURITY],
            operationId: "updateRolePolicyRule",
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              schema: toOpenApiSchema(UpdateRolePolicyRuleInputSchema),
            },
            responses: {
              200: {
                description: "Role policy rule updated",
                schema: toOpenApiSchema(RolePolicyRuleResponseSchema),
              },
              404: {
                description: "Role or rule not found",
                schema: toOpenApiSchema(RolePolicyRulesErrorResponseSchema),
              },
            },
          },
        },
      )
      .delete(
        "/v1/roles/:roleCode/policy-rules/:ruleId",
        this.deleteRolePolicyRule,
        {
          middlewares: [this.adminAuthMiddleware],
          docs: {
            summary: "Delete a role policy rule",
            tags: [CORE_PACK_OPENAPI_TAGS.SECURITY],
            operationId: "deleteRolePolicyRule",
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: "Role policy rule list after delete",
                schema: toOpenApiSchema(ListRolePolicyRulesResponseSchema),
              },
              404: {
                description: "Role or rule not found",
                schema: toOpenApiSchema(RolePolicyRulesErrorResponseSchema),
              },
            },
          },
        },
      )
      .build();
  }

  private listRolePolicyRules = async (ctx: HttpContext) => {
    const roleCode = parsePathParam(ctx.params, "roleCode", ["id"]);
    if (!roleCode) {
      return responder.invalidRequest("Missing role code");
    }

    try {
      const rules = await this.rules.listByRoleCode(roleCode);
      if (!rules) {
        return responder.notFound(`Role "${roleCode}" not found`);
      }
      return responder.list(rules);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private createRolePolicyRule = async (ctx: HttpContext) => {
    const roleCode = parsePathParam(ctx.params, "roleCode", ["id"]);
    if (!roleCode) {
      return responder.invalidRequest("Missing role code");
    }

    try {
      const payload = CreateRolePolicyRuleInputSchema.parse(ctx.body);
      const created = await this.rules.create(roleCode, payload);
      if (!created) {
        return responder.notFound(`Role "${roleCode}" not found`);
      }
      return responder.success(created);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private updateRolePolicyRule = async (ctx: HttpContext) => {
    const roleCode = parsePathParam(ctx.params, "roleCode", ["id"]);
    const id = parsePathParam(ctx.params, "ruleId", ["id"]);
    if (!roleCode) {
      return responder.invalidRequest("Missing role code");
    }
    if (!id) {
      return responder.invalidRequest("Missing policy rule id");
    }

    try {
      const payload = UpdateRolePolicyRuleInputSchema.parse(ctx.body);
      const updated = await this.rules.update(roleCode, id, payload);
      if (!updated) {
        return responder.notFound(
          `Role policy rule "${id}" for role "${roleCode}" not found`,
        );
      }
      return responder.success(updated);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private deleteRolePolicyRule = async (ctx: HttpContext) => {
    const roleCode = parsePathParam(ctx.params, "roleCode", ["id"]);
    const id = parsePathParam(ctx.params, "ruleId", ["id"]);
    if (!roleCode) {
      return responder.invalidRequest("Missing role code");
    }
    if (!id) {
      return responder.invalidRequest("Missing policy rule id");
    }

    try {
      const deleted = await this.rules.delete(roleCode, id);
      if (deleted === null) {
        return responder.notFound(`Role "${roleCode}" not found`);
      }
      if (!deleted) {
        return responder.notFound(
          `Role policy rule "${id}" for role "${roleCode}" not found`,
        );
      }
      const rules = await this.rules.listByRoleCode(roleCode);
      return responder.list(rules ?? []);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
