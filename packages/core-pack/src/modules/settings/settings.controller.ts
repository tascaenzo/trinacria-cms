import {
  createPluginApiResponder,
  HttpController,
  type HttpMiddleware,
  parsePathParam,
  parseQueryNumber,
  toOpenApiSchema,
  type HttpContext,
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import {
  ExportPluginSettingsParamSchema,
  ListSettingDefinitionsQuerySchema,
  SettingKeyParamSchema,
  SettingsErrorResponseSchema,
  UpsertSettingDefinitionInputSchema,
  UpsertSettingSecretInputSchema,
  UpsertSettingValueInputSchema,
} from "./dto/index.js";
import { readOptionalJsonField } from "./settings-http-mapping.js";
import { parseJsonValue } from "./settings-json.js";
import {
  createSettingsPluginAuthMiddleware,
  getAuthenticatedPluginId,
} from "./settings-plugin-auth.middleware.js";
import { SettingsPluginAuthService } from "./settings-plugin-auth.service.js";
import type { SettingsService } from "./settings.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

const JsonValueOpenApi: Record<string, unknown> = {
  oneOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "null" },
    {
      type: "array",
      items: {},
    },
    {
      type: "object",
      additionalProperties: true,
    },
  ],
};

const SettingDefinitionOpenApi: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["id", "key", "ownerPluginId", "status", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    key: { type: "string" },
    ownerPluginId: { type: "string" },
    category: { type: "string" },
    description: { type: "string" },
    schema: JsonValueOpenApi,
    defaultValue: JsonValueOpenApi,
    status: { type: "string", enum: ["active", "disabled"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const SettingValueOpenApi: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "key",
    "ownerPluginId",
    "value",
    "version",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string" },
    key: { type: "string" },
    ownerPluginId: { type: "string" },
    value: JsonValueOpenApi,
    version: { type: "integer" },
    updatedBy: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const SecretMetadataOpenApi: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "key",
    "ownerPluginId",
    "algorithm",
    "keyVersion",
    "maskedValue",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string" },
    key: { type: "string" },
    ownerPluginId: { type: "string" },
    algorithm: { type: "string", enum: ["aes-256-gcm"] },
    keyVersion: { type: "string" },
    maskedValue: { type: "string" },
    updatedBy: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const SignedPluginAuthDescription =
  "Requires signed plugin caller headers: x-cms-plugin-id, x-cms-plugin-ts, x-cms-plugin-nonce, x-cms-plugin-signature.";

/**
 * Public REST API for flexible settings + encrypted secrets.
 */
export class SettingsController extends HttpController {
  private readonly pluginAuthMiddleware: HttpMiddleware;

  constructor(
    private readonly settings: SettingsService,
    pluginAuth: SettingsPluginAuthService,
  ) {
    super();
    this.pluginAuthMiddleware = createSettingsPluginAuthMiddleware(pluginAuth);
  }

  routes() {
    return this.router()
      .get("/v1/settings/definitions", this.listDefinitions, {
        docs: {
          summary: "List setting definitions",
          tags: ["Settings"],
          operationId: "listSettingDefinitions",
          responses: {
            200: {
              description: "Definitions list",
              schema: {
                type: "object",
                properties: {
                  data: { type: "array", items: SettingDefinitionOpenApi },
                  meta: { type: "object", additionalProperties: true },
                },
              },
            },
          },
        },
      })
      .get("/v1/settings/definitions/:key", this.getDefinitionByKey, {
        docs: {
          summary: "Get setting definition by key",
          tags: ["Settings"],
          operationId: "getSettingDefinitionByKey",
          responses: {
            200: {
              description: "Definition",
              schema: {
                type: "object",
                properties: {
                  data: SettingDefinitionOpenApi,
                  meta: { type: "object", additionalProperties: true },
                },
              },
            },
            404: {
              description: "Definition not found",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
          },
        },
      })
      .post(
        "/v1/settings/definitions",
        this.upsertDefinition,
        this.pluginAuthMiddleware,
        {
        docs: {
          summary: "Create or update setting definition",
          description: SignedPluginAuthDescription,
          tags: ["Settings"],
          operationId: "upsertSettingDefinition",
          responses: {
            200: {
              description: "Definition upserted",
              schema: {
                type: "object",
                properties: {
                  data: SettingDefinitionOpenApi,
                  meta: { type: "object", additionalProperties: true },
                },
              },
            },
            409: {
              description: "Ownership conflict",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
          },
        },
      },
      )
      .get("/v1/settings/values/:key", this.getValueByKey, {
        docs: {
          summary: "Resolve setting value by key (explicit or default)",
          tags: ["Settings"],
          operationId: "getSettingValueByKey",
          responses: {
            200: {
              description: "Resolved setting value",
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      key: { type: "string" },
                      ownerPluginId: { type: "string" },
                      value: JsonValueOpenApi,
                      source: { type: "string", enum: ["value", "default"] },
                      version: { type: "integer" },
                      updatedAt: { type: "string", format: "date-time" },
                    },
                  },
                  meta: { type: "object", additionalProperties: true },
                },
              },
            },
            404: {
              description: "Value not found",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
          },
        },
      })
      .put(
        "/v1/settings/values/:key",
        this.upsertValue,
        this.pluginAuthMiddleware,
        {
        docs: {
          summary: "Create or update setting value",
          description: SignedPluginAuthDescription,
          tags: ["Settings"],
          operationId: "upsertSettingValue",
          responses: {
            200: {
              description: "Value upserted",
              schema: {
                type: "object",
                properties: {
                  data: SettingValueOpenApi,
                  meta: { type: "object", additionalProperties: true },
                },
              },
            },
            409: {
              description: "Ownership conflict",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
          },
        },
      },
      )
      .get(
        "/v1/settings/secrets/:key",
        this.getSecretMetadata,
        this.pluginAuthMiddleware,
        {
        docs: {
          summary: "Read secret metadata (masked)",
          description: SignedPluginAuthDescription,
          tags: ["Settings"],
          operationId: "getSettingSecretMetadata",
          responses: {
            200: {
              description: "Secret metadata",
              schema: {
                type: "object",
                properties: {
                  data: SecretMetadataOpenApi,
                  meta: { type: "object", additionalProperties: true },
                },
              },
            },
            404: {
              description: "Secret not found",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
          },
        },
      },
      )
      .put(
        "/v1/settings/secrets/:key",
        this.upsertSecret,
        this.pluginAuthMiddleware,
        {
        docs: {
          summary: "Create or update encrypted secret",
          description: SignedPluginAuthDescription,
          tags: ["Settings"],
          operationId: "upsertSettingSecret",
          responses: {
            200: {
              description: "Secret metadata",
              schema: {
                type: "object",
                properties: {
                  data: SecretMetadataOpenApi,
                  meta: { type: "object", additionalProperties: true },
                },
              },
            },
            409: {
              description: "Ownership conflict",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
          },
        },
      },
      )
      .post(
        "/v1/settings/secrets/:key/reveal",
        this.revealSecret,
        this.pluginAuthMiddleware,
        {
        docs: {
          summary: "Reveal secret value (owner only)",
          description: SignedPluginAuthDescription,
          tags: ["Settings"],
          operationId: "revealSettingSecret",
          responses: {
            200: {
              description: "Secret value",
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    required: ["key", "value"],
                    properties: {
                      key: { type: "string" },
                      value: { type: "string" },
                    },
                  },
                  meta: { type: "object", additionalProperties: true },
                },
              },
            },
            404: {
              description: "Secret not found",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
          },
        },
      },
      )
      .get(
        "/v1/settings/export/:pluginId",
        this.exportPluginSettings,
        this.pluginAuthMiddleware,
        {
        docs: {
          summary: "Export plugin settings snapshot with masked secrets",
          description: SignedPluginAuthDescription,
          tags: ["Settings"],
          operationId: "exportPluginSettings",
          responses: {
            200: {
              description: "Exported settings snapshot",
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    additionalProperties: true,
                  },
                  meta: { type: "object", additionalProperties: true },
                },
              },
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema),
            },
          },
        },
      },
      )
      .build();
  }

  private listDefinitions = async (ctx: HttpContext) => {
    try {
      const ownerPluginId = Array.isArray(ctx.query.ownerPluginId)
        ? ctx.query.ownerPluginId[0]
        : ctx.query.ownerPluginId;
      const query = ListSettingDefinitionsQuerySchema.parse({
        ownerPluginId,
        limit: parseQueryNumber(ctx.query.limit),
        offset: parseQueryNumber(ctx.query.offset),
      });
      const definitions = await this.settings.listDefinitions(query);
      return responder.list(definitions, {
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getDefinitionByKey = async (ctx: HttpContext) => {
    const key = parsePathParam(ctx.params, "key");
    if (!key) {
      return responder.invalidRequest("Missing setting key");
    }

    try {
      const params = SettingKeyParamSchema.parse({ key });
      const definition = await this.settings.getDefinitionByKey(params.key);
      if (!definition) {
        return responder.notFound(`Setting definition "${params.key}" not found`);
      }
      return responder.success(definition);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private upsertDefinition = async (ctx: HttpContext) => {
    try {
      const requesterPluginId = getAuthenticatedPluginId(ctx);
      const payload = UpsertSettingDefinitionInputSchema.parse(ctx.body);
      const definition = await this.settings.upsertDefinition({
        requesterPluginId,
        key: payload.key,
        category: payload.category,
        description: payload.description,
        schema: readOptionalJsonField(ctx.body, "schema"),
        defaultValue: readOptionalJsonField(ctx.body, "defaultValue"),
      });
      return responder.success(definition);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getValueByKey = async (ctx: HttpContext) => {
    const key = parsePathParam(ctx.params, "key");
    if (!key) {
      return responder.invalidRequest("Missing setting key");
    }

    try {
      const params = SettingKeyParamSchema.parse({ key });
      const value = await this.settings.getResolvedValueByKey(params.key);
      if (!value) {
        return responder.notFound(`Setting value "${params.key}" not found`);
      }
      return responder.success(value);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private upsertValue = async (ctx: HttpContext) => {
    const key = parsePathParam(ctx.params, "key");
    if (!key) {
      return responder.invalidRequest("Missing setting key");
    }

    try {
      const requesterPluginId = getAuthenticatedPluginId(ctx);
      const params = SettingKeyParamSchema.parse({ key });
      const payload = UpsertSettingValueInputSchema.parse(ctx.body);
      const rawValue =
        ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body)
          ? (ctx.body as Record<string, unknown>).value
          : undefined;
      if (rawValue === undefined) {
        return responder.invalidRequest("Missing value field");
      }

      const value = await this.settings.upsertValue({
        requesterPluginId,
        key: params.key,
        value: parseJsonValue(rawValue),
        updatedBy: payload.updatedBy,
      });
      return responder.success(value);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getSecretMetadata = async (ctx: HttpContext) => {
    const key = parsePathParam(ctx.params, "key");
    if (!key) {
      return responder.invalidRequest("Missing setting key");
    }

    try {
      const requesterPluginId = getAuthenticatedPluginId(ctx);
      const params = SettingKeyParamSchema.parse({ key });
      const metadata = await this.settings.getSecretMetadata(
        requesterPluginId,
        params.key,
      );
      if (!metadata) {
        return responder.notFound(`Setting secret "${params.key}" not found`);
      }
      return responder.success(metadata);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private upsertSecret = async (ctx: HttpContext) => {
    const key = parsePathParam(ctx.params, "key");
    if (!key) {
      return responder.invalidRequest("Missing setting key");
    }

    try {
      const requesterPluginId = getAuthenticatedPluginId(ctx);
      const params = SettingKeyParamSchema.parse({ key });
      const payload = UpsertSettingSecretInputSchema.parse(ctx.body);
      const secret = await this.settings.upsertSecret({
        requesterPluginId,
        key: params.key,
        plaintext: payload.plaintext,
        updatedBy: payload.updatedBy,
      });
      return responder.success(secret);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private revealSecret = async (ctx: HttpContext) => {
    const key = parsePathParam(ctx.params, "key");
    if (!key) {
      return responder.invalidRequest("Missing setting key");
    }

    try {
      const requesterPluginId = getAuthenticatedPluginId(ctx);
      const params = SettingKeyParamSchema.parse({ key });
      const secret = await this.settings.revealSecret(
        requesterPluginId,
        params.key,
      );
      if (!secret) {
        return responder.notFound(`Setting secret "${params.key}" not found`);
      }
      return responder.success(secret);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private exportPluginSettings = async (ctx: HttpContext) => {
    const pluginId = parsePathParam(ctx.params, "pluginId", ["id"]);
    if (!pluginId) {
      return responder.invalidRequest("Missing plugin id");
    }

    try {
      const requesterPluginId = getAuthenticatedPluginId(ctx);
      const params = ExportPluginSettingsParamSchema.parse({ pluginId });
      const exported = await this.settings.exportPluginSettings(
        requesterPluginId,
        params.pluginId,
      );
      return responder.success(exported);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
