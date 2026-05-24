import {
  createPluginApiResponder,
  HttpController,
  type HttpMiddleware,
  parsePathParam,
  parseQueryNumber,
  toOpenApiSchema,
  type HttpContext
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { CORE_PACK_OPENAPI_TAGS } from "../openapi-tags.js";
import type { JwtAuthService } from "../auth/auth.service.js";
import {
  ExportedPluginSettingsResponseOpenApiSchema,
  ExportPluginSettingsParamSchema,
  ListSettingDefinitionsQuerySchema,
  ListSettingDefinitionsResponseOpenApiSchema,
  ResolvedSettingValueResponseOpenApiSchema,
  RevealedSettingSecretResponseOpenApiSchema,
  SettingKeyParamSchema,
  SettingDefinitionResponseOpenApiSchema,
  SettingSecretMetadataResponseOpenApiSchema,
  SettingValueResponseOpenApiSchema,
  SettingsErrorResponseSchema,
  UpsertSettingDefinitionBodyOpenApiSchema,
  UpsertSettingDefinitionInputSchema,
  UpsertSettingSecretBodyOpenApiSchema,
  UpsertSettingSecretInputSchema,
  UpsertSettingValueBodyOpenApiSchema,
  UpsertSettingValueInputSchema
} from "./dto/index.js";
import { readOptionalJsonField } from "./_shared/settings-http-mapping.js";
import { parseJsonValue } from "./_shared/settings-json.js";
import { getAuthenticatedPluginId } from "./auth/plugin-auth.middleware.js";
import { SettingsPluginAuthService } from "./auth/plugin-auth.service.js";
import {
  createSettingsAccessMiddleware,
  getSettingsAccessMode
} from "./auth/settings-access.middleware.js";
import type { SettingsService } from "./settings.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

const SignedPluginAuthDescription =
  "Requires signed plugin caller headers: x-cms-plugin-id, x-cms-plugin-ts, x-cms-plugin-nonce, x-cms-plugin-signature.";
const AdminOrSignedPluginReadDescription =
  "Requires either an admin bearer token or signed plugin caller headers. Masked secret metadata remains owner-scoped for plugin callers.";

const SettingsListQueryParameters = [
  {
    name: "ownerPluginId",
    in: "query",
    required: false,
    schema: { type: "string" }
  },
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

const ExportPluginSettingsPathParameters = [
  {
    name: "pluginId",
    in: "path",
    required: true,
    schema: { type: "string" }
  }
] as const;

/**
 * Public REST API for flexible settings + encrypted secrets.
 */
export class SettingsController extends HttpController {
  private readonly readAccessMiddleware: HttpMiddleware;
  private readonly pluginAuthMiddleware: HttpMiddleware;

  constructor(
    private readonly settings: SettingsService,
    auth: JwtAuthService,
    pluginAuth: SettingsPluginAuthService
  ) {
    super();
    this.readAccessMiddleware = createSettingsAccessMiddleware(auth, pluginAuth, {
      allowAdmin: true,
      allowPlugin: true
    });
    this.pluginAuthMiddleware = createSettingsAccessMiddleware(auth, pluginAuth, {
      allowAdmin: false,
      allowPlugin: true
    });
  }

  routes() {
    return this.router()
      .get("/v1/settings/definitions", this.listDefinitions, {
        middlewares: [this.readAccessMiddleware],
        docs: {
          summary: "List setting definitions",
          description: AdminOrSignedPluginReadDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "listSettingDefinitions",
          security: [{ bearerAuth: [] }, { pluginCallerAuth: [] }],
          parameters: [...SettingsListQueryParameters],
          responses: {
            200: {
              description: "Definitions list",
              schema: ListSettingDefinitionsResponseOpenApiSchema
            },
            401: {
              description: "Admin or plugin authentication required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .get("/v1/settings/definitions/:key", this.getDefinitionByKey, {
        middlewares: [this.readAccessMiddleware],
        docs: {
          summary: "Get setting definition by key",
          description: AdminOrSignedPluginReadDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "getSettingDefinitionByKey",
          security: [{ bearerAuth: [] }, { pluginCallerAuth: [] }],
          responses: {
            200: {
              description: "Definition",
              schema: SettingDefinitionResponseOpenApiSchema
            },
            401: {
              description: "Admin or plugin authentication required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            404: {
              description: "Definition not found",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .post("/v1/settings/definitions", this.upsertDefinition, {
        middlewares: [this.pluginAuthMiddleware],
        docs: {
          summary: "Create or update setting definition",
          description: SignedPluginAuthDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "upsertSettingDefinition",
          security: [{ pluginCallerAuth: [] }],
          requestBody: {
            required: true,
            schema: UpsertSettingDefinitionBodyOpenApiSchema
          },
          responses: {
            200: {
              description: "Definition upserted",
              schema: SettingDefinitionResponseOpenApiSchema
            },
            403: {
              description: "Owner plugin required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .get("/v1/settings/values/:key", this.getValueByKey, {
        middlewares: [this.readAccessMiddleware],
        docs: {
          summary: "Resolve setting value by key (explicit or default)",
          description: AdminOrSignedPluginReadDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "getSettingValueByKey",
          security: [{ bearerAuth: [] }, { pluginCallerAuth: [] }],
          responses: {
            200: {
              description: "Resolved setting value",
              schema: ResolvedSettingValueResponseOpenApiSchema
            },
            401: {
              description: "Admin or plugin authentication required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            404: {
              description: "Value not found",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .put("/v1/settings/values/:key", this.upsertValue, {
        middlewares: [this.pluginAuthMiddleware],
        docs: {
          summary: "Create or update setting value",
          description: SignedPluginAuthDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "upsertSettingValue",
          security: [{ pluginCallerAuth: [] }],
          requestBody: {
            required: true,
            schema: UpsertSettingValueBodyOpenApiSchema
          },
          responses: {
            200: {
              description: "Value upserted",
              schema: SettingValueResponseOpenApiSchema
            },
            403: {
              description: "Owner plugin required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .get("/v1/settings/secrets/:key", this.getSecretMetadata, {
        middlewares: [this.readAccessMiddleware],
        docs: {
          summary: "Read secret metadata (masked)",
          description: AdminOrSignedPluginReadDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "getSettingSecretMetadata",
          security: [{ bearerAuth: [] }, { pluginCallerAuth: [] }],
          responses: {
            200: {
              description: "Secret metadata",
              schema: SettingSecretMetadataResponseOpenApiSchema
            },
            403: {
              description: "Owner plugin required for plugin-signed secret metadata reads",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            404: {
              description: "Secret not found",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .put("/v1/settings/secrets/:key", this.upsertSecret, {
        middlewares: [this.pluginAuthMiddleware],
        docs: {
          summary: "Create or update encrypted secret",
          description: SignedPluginAuthDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "upsertSettingSecret",
          security: [{ pluginCallerAuth: [] }],
          requestBody: {
            required: true,
            schema: UpsertSettingSecretBodyOpenApiSchema
          },
          responses: {
            200: {
              description: "Secret metadata",
              schema: SettingSecretMetadataResponseOpenApiSchema
            },
            403: {
              description: "Owner plugin required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .post("/v1/settings/secrets/:key/reveal", this.revealSecret, {
        middlewares: [this.pluginAuthMiddleware],
        docs: {
          summary: "Reveal secret value (owner only)",
          description: SignedPluginAuthDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "revealSettingSecret",
          security: [{ pluginCallerAuth: [] }],
          responses: {
            200: {
              description: "Secret value",
              schema: RevealedSettingSecretResponseOpenApiSchema
            },
            403: {
              description: "Owner plugin required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            404: {
              description: "Secret not found",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .get("/v1/settings/export/:pluginId", this.exportPluginSettings, {
        middlewares: [this.pluginAuthMiddleware],
        docs: {
          summary: "Export plugin settings snapshot with masked secrets",
          description: SignedPluginAuthDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "exportPluginSettings",
          security: [{ pluginCallerAuth: [] }],
          parameters: [...ExportPluginSettingsPathParameters],
          responses: {
            200: {
              description: "Exported settings snapshot",
              schema: ExportedPluginSettingsResponseOpenApiSchema
            },
            403: {
              description: "Owner plugin required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            401: {
              description: "Plugin caller authentication failed",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
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
        offset: parseQueryNumber(ctx.query.offset)
      });
      const definitions = await this.settings.listDefinitions(query);
      return responder.list(definitions, {
        limit: query.limit,
        offset: query.offset
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
        defaultValue: readOptionalJsonField(ctx.body, "defaultValue")
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
        updatedBy: payload.updatedBy
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
      const params = SettingKeyParamSchema.parse({ key });
      const metadata =
        getSettingsAccessMode(ctx) === "admin"
          ? await this.settings.getSecretMetadataByKey(params.key)
          : await this.settings.getSecretMetadata(getAuthenticatedPluginId(ctx), params.key);
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
        updatedBy: payload.updatedBy
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
      const secret = await this.settings.revealSecret(requesterPluginId, params.key);
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
      const exported = await this.settings.exportPluginSettings(requesterPluginId, params.pluginId);
      return responder.success(exported);
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
