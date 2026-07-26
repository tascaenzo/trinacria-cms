import {
  createPluginApiResponder,
  type HttpContext,
  HttpController,
  type HttpMiddleware,
  parsePathParam,
  parseQueryNumber,
  toOpenApiSchema
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import type { JwtAuthService } from "../auth/services/auth.service.js";
import { CORE_PACK_OPENAPI_TAGS } from "../openapi-tags.js";
import { readOptionalJsonField } from "./_shared/settings-http-mapping.js";
import { parseJsonValue } from "./_shared/settings-json.js";
import { getOwnerPluginIdFromSettingKey } from "./_shared/settings-key.js";
import { getAuthenticatedPluginId } from "./auth/plugin-auth.middleware.js";
import type { SettingsPluginAuthService } from "./auth/plugin-auth.service.js";
import {
  createSettingsAccessMiddleware,
  getSettingsAccessMode
} from "./auth/settings-access.middleware.js";
import {
  ExportedPluginSettingsResponseOpenApiSchema,
  ExportPluginSettingsParamSchema,
  ListSettingDefinitionsQuerySchema,
  ListSettingDefinitionsResponseOpenApiSchema,
  ListSettingsGroupsResponseOpenApiSchema,
  ResolvedSettingValueResponseOpenApiSchema,
  RevealedSettingSecretResponseOpenApiSchema,
  SettingDefinitionResponseOpenApiSchema,
  SettingKeyParamSchema,
  SettingSecretMetadataResponseOpenApiSchema,
  SettingsErrorResponseSchema,
  SettingsGroupParamSchema,
  SettingsGroupSnapshotResponseOpenApiSchema,
  SettingsGroupUpdateResultResponseOpenApiSchema,
  SettingValueResponseOpenApiSchema,
  UpsertSettingDefinitionBodyOpenApiSchema,
  UpsertSettingDefinitionInputSchema,
  UpsertSettingSecretBodyOpenApiSchema,
  UpsertSettingSecretInputSchema,
  UpsertSettingsGroupValuesBodyOpenApiSchema,
  UpsertSettingsGroupValuesInputSchema,
  UpsertSettingValueBodyOpenApiSchema,
  UpsertSettingValueInputSchema
} from "./dto/index.js";
import type { SettingsService } from "./services/settings.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);

const SignedPluginAuthDescription =
  "Requires signed plugin caller headers: x-cms-plugin-id, x-cms-plugin-ts, x-cms-plugin-nonce, x-cms-plugin-signature.";
const AdminOrSignedPluginReadDescription =
  "Requires either an admin bearer token or signed plugin caller headers. Masked secret metadata remains owner-scoped for plugin callers.";
const AdminOrSignedPluginWriteDescription =
  "Requires either an admin bearer token or signed plugin caller headers. Admin writes are executed against the owner inferred from the setting key.";

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

const SettingsGroupPathParameters = [
  {
    name: "groupId",
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
  private readonly writeAccessMiddleware: HttpMiddleware;
  private readonly adminOnlyMiddleware: HttpMiddleware;

  constructor(
    private readonly settings: SettingsService,
    auth: JwtAuthService,
    private readonly pluginAuth: SettingsPluginAuthService
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
    this.writeAccessMiddleware = createSettingsAccessMiddleware(auth, pluginAuth, {
      allowAdmin: true,
      allowPlugin: true
    });
    this.adminOnlyMiddleware = createSettingsAccessMiddleware(auth, pluginAuth, {
      allowAdmin: true,
      allowPlugin: false
    });
  }

  routes() {
    return this.router()
      .get("/v1/settings/groups", this.listGroups, {
        middlewares: [this.readAccessMiddleware],
        docs: {
          summary: "List grouped settings forms",
          description: AdminOrSignedPluginReadDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "listSettingsGroups",
          security: [{ bearerAuth: [] }, { pluginCallerAuth: [] }],
          parameters: [...SettingsListQueryParameters],
          responses: {
            200: {
              description: "Settings groups list",
              schema: ListSettingsGroupsResponseOpenApiSchema
            },
            401: {
              description: "Admin or plugin authentication required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .get("/v1/settings/groups/:groupId", this.getGroupById, {
        middlewares: [this.readAccessMiddleware],
        docs: {
          summary: "Read a grouped settings form",
          description: AdminOrSignedPluginReadDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "getSettingsGroupById",
          security: [{ bearerAuth: [] }, { pluginCallerAuth: [] }],
          parameters: [...SettingsGroupPathParameters],
          responses: {
            200: {
              description: "Resolved settings group",
              schema: SettingsGroupSnapshotResponseOpenApiSchema
            },
            401: {
              description: "Admin or plugin authentication required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            404: {
              description: "Settings group not found",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .patch("/v1/settings/groups/:groupId", this.upsertGroupValues, {
        middlewares: [this.readAccessMiddleware],
        docs: {
          summary: "Patch grouped non-secret settings values",
          description: AdminOrSignedPluginWriteDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "upsertSettingsGroupValues",
          security: [{ bearerAuth: [] }, { pluginCallerAuth: [] }],
          parameters: [...SettingsGroupPathParameters],
          requestBody: {
            required: true,
            schema: UpsertSettingsGroupValuesBodyOpenApiSchema
          },
          responses: {
            200: {
              description: "Settings group values updated",
              schema: SettingsGroupUpdateResultResponseOpenApiSchema
            },
            401: {
              description: "Admin or plugin authentication required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            403: {
              description: "Owner plugin required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            },
            404: {
              description: "Settings group not found",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
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
        middlewares: [this.readAccessMiddleware],
        docs: {
          summary: "Create or update setting value",
          description: AdminOrSignedPluginWriteDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "upsertSettingValue",
          security: [{ bearerAuth: [] }, { pluginCallerAuth: [] }],
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
        middlewares: [this.writeAccessMiddleware],
        docs: {
          summary: "Create or update encrypted secret",
          description: AdminOrSignedPluginWriteDescription,
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "upsertSettingSecret",
          security: [{ bearerAuth: [] }, { pluginCallerAuth: [] }],
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
              description: "Admin or plugin authentication required",
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
      .get("/v1/settings/observability", this.getObservability, {
        middlewares: [this.adminOnlyMiddleware],
        docs: {
          summary: "Read settings observability snapshot",
          description: "Admin-only operational counters for settings read/write/deny/error flows.",
          tags: [CORE_PACK_OPENAPI_TAGS.SETTINGS],
          operationId: "getSettingsObservability",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Observability counters",
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["data"],
                properties: {
                  data: {
                    type: "object",
                    additionalProperties: false,
                    required: ["reads", "writes", "denies", "errors", "pluginAuth"],
                    properties: {
                      reads: { type: "integer" },
                      writes: { type: "integer" },
                      denies: { type: "integer" },
                      errors: { type: "integer" },
                      pluginAuth: {
                        type: "object",
                        additionalProperties: false,
                        required: ["successes", "failures", "replays"],
                        properties: {
                          successes: { type: "integer" },
                          failures: { type: "integer" },
                          replays: { type: "integer" }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: "Admin authentication required",
              schema: toOpenApiSchema(SettingsErrorResponseSchema)
            }
          }
        }
      })
      .build();
  }

  private listGroups = async (ctx: HttpContext) => {
    try {
      const ownerPluginId = Array.isArray(ctx.query.ownerPluginId)
        ? ctx.query.ownerPluginId[0]
        : ctx.query.ownerPluginId;
      const query = ListSettingDefinitionsQuerySchema.parse({
        ownerPluginId,
        limit: parseQueryNumber(ctx.query.limit),
        offset: parseQueryNumber(ctx.query.offset)
      });
      const groups =
        getSettingsAccessMode(ctx) === "admin"
          ? await this.settings.listGroups({ ownerPluginId: query.ownerPluginId })
          : await this.settings.listGroupsForPlugin(getAuthenticatedPluginId(ctx));
      return responder.list(groups);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private getGroupById = async (ctx: HttpContext) => {
    const groupId = parsePathParam(ctx.params, "groupId");
    if (!groupId) {
      return responder.invalidRequest("Missing settings group id");
    }

    try {
      const params = SettingsGroupParamSchema.parse({ groupId });
      const group =
        getSettingsAccessMode(ctx) === "admin"
          ? await this.settings.getGroupById(params.groupId)
          : await this.settings.getGroupForPlugin(getAuthenticatedPluginId(ctx), params.groupId);
      if (!group) {
        return responder.notFound(`Settings group "${params.groupId}" not found`);
      }
      return responder.success(group);
    } catch (error) {
      return responder.fromError(error);
    }
  };

  private upsertGroupValues = async (ctx: HttpContext) => {
    const groupId = parsePathParam(ctx.params, "groupId");
    if (!groupId) {
      return responder.invalidRequest("Missing settings group id");
    }

    try {
      const params = SettingsGroupParamSchema.parse({ groupId });
      const payload = UpsertSettingsGroupValuesInputSchema.parse(ctx.body);
      const rawValues =
        ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body)
          ? (ctx.body as Record<string, unknown>).values
          : undefined;
      if (!rawValues || typeof rawValues !== "object" || Array.isArray(rawValues)) {
        return responder.invalidRequest("Missing values object");
      }

      const result = await this.settings.upsertGroupValues({
        requesterPluginId:
          getSettingsAccessMode(ctx) === "admin"
            ? CORE_PACK_PLUGIN_ID
            : getAuthenticatedPluginId(ctx),
        groupId: params.groupId,
        values: rawValues as Record<string, unknown>,
        updatedBy: payload.updatedBy,
        admin: getSettingsAccessMode(ctx) === "admin"
      });
      return responder.success(result);
    } catch (error) {
      return responder.fromError(error);
    }
  };

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
      const definitions =
        getSettingsAccessMode(ctx) === "admin"
          ? await this.settings.listDefinitions(query)
          : await this.settings.listDefinitionsForPlugin(getAuthenticatedPluginId(ctx), query);
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
      const definition =
        getSettingsAccessMode(ctx) === "admin"
          ? await this.settings.getDefinitionByKey(params.key)
          : await this.settings.getDefinitionByKeyForPlugin(
              getAuthenticatedPluginId(ctx),
              params.key
            );
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
        status: payload.status,
        visibility: payload.visibility,
        mutable: payload.mutable,
        secret: payload.secret,
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
      const value =
        getSettingsAccessMode(ctx) === "admin"
          ? await this.settings.getResolvedValueByKey(params.key)
          : await this.settings.getResolvedValueForPlugin(
              getAuthenticatedPluginId(ctx),
              params.key
            );
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
      const params = SettingKeyParamSchema.parse({ key });
      const requesterPluginId =
        getSettingsAccessMode(ctx) === "admin"
          ? getOwnerPluginIdFromSettingKey(params.key)
          : getAuthenticatedPluginId(ctx);
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
      const params = SettingKeyParamSchema.parse({ key });
      const payload = UpsertSettingSecretInputSchema.parse(ctx.body);
      const requesterPluginId =
        getSettingsAccessMode(ctx) === "admin"
          ? getOwnerPluginIdFromSettingKey(params.key)
          : getAuthenticatedPluginId(ctx);
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

  private getObservability = async () => {
    return responder.success({
      ...this.settings.getObservabilitySnapshot(),
      pluginAuth: this.pluginAuth.getObservabilitySnapshot()
    });
  };
}
