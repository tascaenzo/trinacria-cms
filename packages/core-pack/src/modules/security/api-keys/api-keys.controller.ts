import {
  createPluginApiResponder,
  HttpController,
  parseQueryNumber,
  toOpenApiSchema,
  type HttpContext,
  type HttpMiddleware,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import { CORE_PACK_OPENAPI_TAGS } from "../../openapi-tags.js";
import { createJwtAuthMiddleware } from "../../auth/auth.middleware.js";
import type { JwtAuthService } from "../../auth/auth.service.js";
import {
  ApiKeyResponseSchema,
  ApiKeySecretResponseSchema,
  ApiKeysErrorResponseSchema,
  ListApiKeysResponseSchema,
} from "./dto/api-keys.response.dto.js";
import {
  CreateApiKeyInputSchema,
  ListApiKeysQuerySchema,
  RevokeApiKeyInputSchema,
  RotateApiKeyInputSchema,
} from "./dto/api-keys.input.dto.js";
import type { ApiKeysService } from "./api-keys.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

const ApiKeysListQueryParameters = [
  {
    name: "kind",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["publishable", "secret", "service"] },
  },
  {
    name: "status",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["active", "revoked"] },
  },
  {
    name: "limit",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 200 },
  },
  {
    name: "offset",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 0 },
  },
] as const;

/**
 * Admin HTTP API for issuing and managing machine credentials.
 */
export class ApiKeysController extends HttpController {
  private readonly adminAuthMiddleware: HttpMiddleware;

  constructor(
    private readonly apiKeys: ApiKeysService,
    auth: JwtAuthService,
  ) {
    super();
    this.adminAuthMiddleware = createJwtAuthMiddleware(auth, {
      requireAdmin: true,
    });
  }

  routes() {
    return this.router()
      .get("/v1/api-keys", this.listApiKeys, {
        middlewares: [this.adminAuthMiddleware],
        docs: {
          summary: "List issued API keys",
          tags: [CORE_PACK_OPENAPI_TAGS.API_KEYS],
          operationId: "listApiKeys",
          security: [{ bearerAuth: [] }],
          parameters: [...ApiKeysListQueryParameters],
          responses: {
            200: {
              description: "API key list",
              schema: toOpenApiSchema(ListApiKeysResponseSchema),
            },
          },
        },
      })
      .get("/v1/api-keys/:id", this.getApiKeyById, {
        middlewares: [this.adminAuthMiddleware],
        docs: {
          summary: "Get one API key metadata record",
          tags: [CORE_PACK_OPENAPI_TAGS.API_KEYS],
          operationId: "getApiKeyById",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "API key metadata",
              schema: toOpenApiSchema(ApiKeyResponseSchema),
            },
            404: {
              description: "API key not found",
              schema: toOpenApiSchema(ApiKeysErrorResponseSchema),
            },
          },
        },
      })
      .post("/v1/api-keys", this.createApiKey, {
        middlewares: [this.adminAuthMiddleware],
        docs: {
          summary: "Issue a new API key",
          tags: [CORE_PACK_OPENAPI_TAGS.API_KEYS],
          operationId: "createApiKey",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            schema: toOpenApiSchema(CreateApiKeyInputSchema),
          },
          responses: {
            200: {
              description: "Issued API key with one-time secret",
              schema: toOpenApiSchema(ApiKeySecretResponseSchema),
            },
            409: {
              description: "API key configuration invalid",
              schema: toOpenApiSchema(ApiKeysErrorResponseSchema),
            },
          },
        },
      })
      .post("/v1/api-keys/:id/rotate", this.rotateApiKey, {
        middlewares: [this.adminAuthMiddleware],
        docs: {
          summary: "Rotate an existing API key",
          tags: [CORE_PACK_OPENAPI_TAGS.API_KEYS],
          operationId: "rotateApiKey",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            schema: toOpenApiSchema(RotateApiKeyInputSchema),
          },
          responses: {
            200: {
              description: "Rotated API key with one-time secret",
              schema: toOpenApiSchema(ApiKeySecretResponseSchema),
            },
            404: {
              description: "API key not found",
              schema: toOpenApiSchema(ApiKeysErrorResponseSchema),
            },
          },
        },
      })
      .post("/v1/api-keys/:id/revoke", this.revokeApiKey, {
        middlewares: [this.adminAuthMiddleware],
        docs: {
          summary: "Revoke an API key",
          tags: [CORE_PACK_OPENAPI_TAGS.API_KEYS],
          operationId: "revokeApiKey",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            schema: toOpenApiSchema(RevokeApiKeyInputSchema),
          },
          responses: {
            200: {
              description: "Revoked API key metadata",
              schema: toOpenApiSchema(ApiKeyResponseSchema),
            },
            404: {
              description: "API key not found",
              schema: toOpenApiSchema(ApiKeysErrorResponseSchema),
            },
          },
        },
      })
      .build();
  }

  private listApiKeys = async (ctx: HttpContext) => {
    try {
      const query = ListApiKeysQuerySchema.parse({
        kind: Array.isArray(ctx.query.kind) ? ctx.query.kind[0] : ctx.query.kind,
        status: Array.isArray(ctx.query.status) ? ctx.query.status[0] : ctx.query.status,
        limit: parseQueryNumber(ctx.query.limit),
        offset: parseQueryNumber(ctx.query.offset),
      });
      const records = await this.apiKeys.list(query);
      return responder.list(records, {
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getApiKeyById = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) {
      return responder.invalidRequest("Missing api key id");
    }

    try {
      const record = await this.apiKeys.getById(id);
      if (!record) {
        return responder.notFound(`API key "${id}" not found`);
      }
      return responder.success(record);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private createApiKey = async (ctx: HttpContext) => {
    try {
      const payload = CreateApiKeyInputSchema.parse(ctx.body);
      const created = await this.apiKeys.create(payload);
      return responder.success(created);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private rotateApiKey = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) {
      return responder.invalidRequest("Missing api key id");
    }

    try {
      const payload =
        ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body)
          ? RotateApiKeyInputSchema.parse(ctx.body)
          : undefined;
      const rotated = await this.apiKeys.rotate(id, payload);
      if (!rotated) {
        return responder.notFound(`API key "${id}" not found`);
      }
      return responder.success(rotated);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private revokeApiKey = async (ctx: HttpContext) => {
    const id = ctx.params.id;
    if (!id) {
      return responder.invalidRequest("Missing api key id");
    }

    try {
      const payload =
        ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body)
          ? RevokeApiKeyInputSchema.parse(ctx.body)
          : undefined;
      const revoked = await this.apiKeys.revoke(id, payload?.reason);
      if (!revoked) {
        return responder.notFound(`API key "${id}" not found`);
      }
      return responder.success(revoked);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
