import type { OpenApiDocument } from "@trinacria/http";
import type { CmsStarterOptions, CmsSwaggerUiConfig } from "../../contracts/cms-starter.js";

type OpenApiConfig = NonNullable<NonNullable<CmsStarterOptions["http"]>["openApi"]>;

export function resolveSwaggerUiConfig(options: CmsStarterOptions): CmsSwaggerUiConfig {
  return {
    enabled: options.swaggerUi?.enabled ?? true,
    path: options.swaggerUi?.path ?? "/docs",
    openApiJsonPath: options.swaggerUi?.openApiJsonPath ?? "/openapi.json",
    title: options.swaggerUi?.title ?? options.http?.openApi?.title ?? "Trinacria CMS API Docs"
  };
}

export function createOpenApiConfig(openApiConfig: OpenApiConfig | undefined) {
  if (!openApiConfig) {
    return undefined;
  }

  return {
    ...openApiConfig,
    transformDocument: (document: OpenApiDocument) => {
      const withJwtScheme = withCmsSecuritySchemes(document);
      return openApiConfig.transformDocument
        ? openApiConfig.transformDocument(withJwtScheme)
        : withJwtScheme;
    },
    onDocumentGenerated: (document: OpenApiDocument) => {
      openApiConfig.onDocumentGenerated?.(document);
    }
  };
}

function withCmsSecuritySchemes(document: OpenApiDocument): OpenApiDocument {
  const components =
    document.components && typeof document.components === "object"
      ? (document.components as Record<string, unknown>)
      : {};
  const securitySchemes =
    components.securitySchemes && typeof components.securitySchemes === "object"
      ? (components.securitySchemes as Record<string, unknown>)
      : {};

  return {
    ...document,
    components: {
      ...components,
      securitySchemes: {
        ...securitySchemes,
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Paste access token as `Bearer <token>`"
        },
        pluginCallerAuth: {
          type: "apiKey",
          in: "header",
          name: "x-cms-plugin-signature",
          description:
            "Signed plugin caller flow. Requests also require x-cms-plugin-id, x-cms-plugin-ts, and x-cms-plugin-nonce headers."
        }
      }
    }
  };
}
