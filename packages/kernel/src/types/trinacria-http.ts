/**
 * Minimal augmentation for `@trinacria/http` route docs.
 * The CMS uses extra OpenAPI parameter metadata that the upstream package
 * does not type yet.
 */
declare module "@trinacria/http" {
  export interface RouteOpenApiParameter {
    name: string;
    in: "path" | "query" | "header" | "cookie";
    required?: boolean;
    description?: string;
    schema?: Record<string, unknown>;
  }

  export interface RouteOpenApiDocs {
    parameters?: RouteOpenApiParameter[];
  }
}

export {};
