import type { TrinacriaApp } from "@trinacria/core";
import type { OpenApiDocument, OpenApiRouteEntry } from "@trinacria/http";
import type {
  CmsHttpRouteInfo,
  CmsStarterOptions,
  CmsSwaggerUiConfig
} from "../../contracts/cms-starter.js";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";

type OpenApiConfig = NonNullable<NonNullable<CmsStarterOptions["http"]>["openApi"]>;
export function resolveSwaggerUiConfig(options: CmsStarterOptions): CmsSwaggerUiConfig {
  return {
    enabled: options.swaggerUi?.enabled ?? true,
    path: options.swaggerUi?.path ?? "/docs",
    openApiJsonPath: options.swaggerUi?.openApiJsonPath ?? "/openapi.json",
    title: options.swaggerUi?.title ?? options.http?.openApi?.title ?? "Trinacria CMS API Docs"
  };
}

/** Uses the same route entries as the router, including dynamically loaded controllers. */
export function createOpenApiHooks(config: OpenApiConfig | undefined, app: TrinacriaApp) {
  let document: OpenApiDocument | undefined;
  let inventory: readonly CmsHttpRouteInfo[] = [];
  return {
    config: config
      ? {
          ...config,
          transformDocument: (input: OpenApiDocument) => withCmsSecuritySchemes(input),
          onDocumentGenerated: (input: OpenApiDocument) => {
            document = input;
          },
          jsonMiddlewares: [
            async (_ctx: unknown, next: () => Promise<unknown>) => {
              if (document && app.hasToken(CORE_TOKENS.HTTP_ACCESS_COOKIE_NAME)) {
                const cookieName = await (await app.resolve(CORE_TOKENS.HTTP_ACCESS_COOKIE_NAME))();
                const schemes = document.components!.securitySchemes as Record<
                  string,
                  Record<string, unknown>
                >;
                schemes.cookieAuth.name = cookieName;
              }
              return next();
            }
          ]
        }
      : undefined,
    getInventory: () => inventory.map((item) => ({ ...item })),
    onRoutesRebuilt: (entries: OpenApiRouteEntry[]) => {
      inventory = entries.map(({ route, controllerName }) => ({
        method: route.method,
        path: normalizePath(route.path),
        controllerName,
        publicApi: !route.docs?.excludeFromOpenApi,
        pluginId: route.docs?.pluginId,
        operationId: route.docs?.operationId,
        exclusionReason: route.docs?.exclusionReason
      }));
      if (!document || !config?.enabled) return;
      for (const { route } of entries) {
        if (route.docs?.excludeFromOpenApi) continue;
        const operation = document.paths[normalizePath(route.path)]?.[route.method.toLowerCase()] as
          | Record<string, unknown>
          | undefined;
        if (!operation) throw new Error(`OpenAPI omitted ${route.method} ${route.path}`);
        operation["x-cms-plugin-id"] = route.docs?.pluginId;
        const parameters = [
          ...((operation.parameters ?? []) as Record<string, unknown>[]),
          ...(route.docs?.parameters ?? [])
        ];
        const merged = new Map(parameters.map((p) => [`${p.in}:${p.name}`, p]));
        operation.parameters = [...merged.values()];
        const security = operation.security as Array<Record<string, string[]>> | undefined;
        if (security)
          operation.security = security
            .flatMap((requirement) => {
              if ("pluginCallerAuth" in requirement) {
                for (const name of [
                  "x-cms-plugin-id",
                  "x-cms-plugin-ts",
                  "x-cms-plugin-nonce",
                  "x-cms-plugin-signature",
                  "x-cms-plugin-auth-version",
                  "x-cms-plugin-key-id"
                ]) {
                  if (!merged.has(`header:${name}`))
                    (operation.parameters as unknown[]).push({
                      name,
                      in: "header",
                      required: false,
                      description:
                        "Required together for the signed plugin alternative; body must be canonicalized",
                      schema: { type: "string" }
                    });
                }
                return [
                  {
                    ...requirement,
                    pluginCallerId: [],
                    pluginCallerTimestamp: [],
                    pluginCallerNonce: [],
                    pluginCallerVersion: [],
                    pluginCallerKeyId: []
                  }
                ];
              }
              return "bearerAuth" in requirement
                ? [
                    requirement,
                    {
                      ...Object.fromEntries(
                        Object.entries(requirement).filter(([key]) => key !== "bearerAuth")
                      ),
                      cookieAuth: []
                    }
                  ]
                : [requirement];
            })
            .filter(
              (r, i, all) =>
                all.findIndex((other) => JSON.stringify(other) === JSON.stringify(r)) === i
            );
      }
      if (config.transformDocument) Object.assign(document, config.transformDocument(document));
      validateOpenApiRoutes(document, inventory);
      (document as OpenApiDocument & { "x-cms-route-inventory": readonly CmsHttpRouteInfo[] })[
        "x-cms-route-inventory"
      ] = inventory;
      config.onDocumentGenerated?.(document);
    }
  };
}

export function validateOpenApiRoutes(
  document: OpenApiDocument,
  inventory: readonly CmsHttpRouteInfo[]
) {
  const rawIds = new Set<string>(),
    normalizedIds = new Set<string>();
  const routes = new Set(
    inventory.filter((r) => r.publicApi).map((r) => `${r.method.toLowerCase()} ${r.path}`)
  );
  for (const item of inventory) {
    if (!item.publicApi && !item.exclusionReason)
      throw new Error(`Excluded route needs a reason: ${item.method} ${item.path}`);
    if (item.publicApi && (!item.operationId || !item.pluginId))
      throw new Error(`Public route needs operationId and pluginId: ${item.method} ${item.path}`);
  }
  for (const [path, methods] of Object.entries(document.paths))
    for (const [method, value] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete", "options", "head"].includes(method)) continue;
      if (!routes.has(`${method} ${path}`))
        throw new Error(`OpenAPI contains an unregistered route: ${method} ${path}`);
      const operation = value as Record<string, unknown>;
      const id = operation.operationId as string;
      const normalized = id?.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (!id || rawIds.has(id) || normalizedIds.has(normalized))
        throw new Error(`Duplicate/invalid operationId: ${id}`);
      rawIds.add(id);
      normalizedIds.add(normalized);
      if (
        !Array.isArray(operation.tags) ||
        operation.tags.length !== 1 ||
        typeof operation.tags[0] !== "string"
      )
        throw new Error(`Operation needs one SDK tag: ${id}`);
      if (!operation.responses || typeof operation.responses !== "object")
        throw new Error(`Operation needs responses: ${id}`);
      const parameters = (operation.parameters ?? []) as Array<Record<string, unknown>>;
      for (const match of path.matchAll(/\{([^}]+)\}/g))
        if (!parameters.some((p) => p.in === "path" && p.name === match[1] && p.required === true))
          throw new Error(`Missing required path parameter ${id}:${match[1]}`);
      for (const requirement of (operation.security ?? []) as Array<Record<string, unknown>>)
        for (const scheme of Object.keys(requirement)) {
          if (
            !(document.components?.securitySchemes as Record<string, unknown> | undefined)?.[scheme]
          )
            throw new Error(`Unknown security scheme: ${scheme}`);
        }
    }
  for (const route of routes) {
    const [method, path] = route.split(" ");
    if (!document.paths[path]?.[method]) throw new Error(`Route missing from OpenAPI: ${route}`);
  }
  function checkRefs(value: unknown): void {
    if (!value || typeof value !== "object") return;
    if ("$ref" in value) {
      const ref = (value as { $ref: string }).$ref;
      if (!ref.startsWith("#/")) throw new Error(`External OpenAPI ref is unsupported: ${ref}`);
      let resolved: unknown = document;
      for (const part of ref
        .slice(2)
        .split("/")
        .map((p) => p.replaceAll("~1", "/").replaceAll("~0", "~")))
        resolved = (resolved as Record<string, unknown> | undefined)?.[part];
      if (!resolved) throw new Error(`Unresolved OpenAPI ref: ${ref}`);
    }
    for (const child of Object.values(value)) checkRefs(child);
  }
  checkRefs(document);
}
function normalizePath(path: string) {
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}
function withCmsSecuritySchemes(document: OpenApiDocument): OpenApiDocument {
  const components = document.components ?? {};
  return {
    ...document,
    components: {
      ...components,
      securitySchemes: {
        ...((components.securitySchemes as object) ?? {}),
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: process.env.CMS_JWT_ACCESS_COOKIE_NAME?.trim() || "cms_access_token",
          description:
            "Access cookie configured by the host; cookie mutations require a trusted CSRF origin"
        },
        ...Object.fromEntries(
          [
            ["pluginCallerAuth", "x-cms-plugin-signature"],
            ["pluginCallerId", "x-cms-plugin-id"],
            ["pluginCallerTimestamp", "x-cms-plugin-ts"],
            ["pluginCallerNonce", "x-cms-plugin-nonce"],
            ["pluginCallerVersion", "x-cms-plugin-auth-version"],
            ["pluginCallerKeyId", "x-cms-plugin-key-id"]
          ].map(([key, name]) => [
            key,
            {
              type: "apiKey",
              in: "header",
              name,
              description:
                "All six v2 plugin headers are required together, signing method, query, timestamp, nonce, key ID and canonical body"
            }
          ])
        )
      }
    }
  };
}
