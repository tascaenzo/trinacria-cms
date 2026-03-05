declare module "@trinacria/http" {
  import type { Plugin, Provider, Token } from "@trinacria/core";

  export interface HttpContext {
    req: unknown;
    res: unknown;
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    body: unknown;
    state: Record<string, unknown>;
  }

  export type HttpMiddleware = (
    ctx: HttpContext,
    next: () => Promise<unknown>,
  ) => Promise<unknown>;

  export interface RouteOpenApiRequestBody {
    required?: boolean;
    description?: string;
    contentType?: string;
    schema?: Record<string, unknown>;
  }

  export interface RouteOpenApiResponse {
    description: string;
    contentType?: string;
    schema?: Record<string, unknown>;
  }

  export interface RouteOpenApiDocs {
    excludeFromOpenApi?: boolean;
    summary?: string;
    description?: string;
    operationId?: string;
    tags?: string[];
    deprecated?: boolean;
    security?: Array<Record<string, string[]>>;
    requestBody?: RouteOpenApiRequestBody;
    responses?: Record<number, RouteOpenApiResponse>;
  }

  export interface RouteOptions {
    middlewares?: HttpMiddleware[];
    docs?: RouteOpenApiDocs;
  }

  export interface RouteBuilder {
    get(
      path: string,
      handler: (ctx: HttpContext) => unknown | Promise<unknown>,
      ...args: Array<HttpMiddleware | RouteOptions>
    ): RouteBuilder;
    post(
      path: string,
      handler: (ctx: HttpContext) => unknown | Promise<unknown>,
      ...args: Array<HttpMiddleware | RouteOptions>
    ): RouteBuilder;
    put(
      path: string,
      handler: (ctx: HttpContext) => unknown | Promise<unknown>,
      ...args: Array<HttpMiddleware | RouteOptions>
    ): RouteBuilder;
    patch(
      path: string,
      handler: (ctx: HttpContext) => unknown | Promise<unknown>,
      ...args: Array<HttpMiddleware | RouteOptions>
    ): RouteBuilder;
    delete(
      path: string,
      handler: (ctx: HttpContext) => unknown | Promise<unknown>,
      ...args: Array<HttpMiddleware | RouteOptions>
    ): RouteBuilder;
    build(): unknown;
  }

  export class HttpController {
    protected router(): RouteBuilder;
  }

  export class HttpResponse<T = unknown> {
    readonly status?: number;
    readonly headers?: Record<string, string | readonly string[]>;
    readonly body: T;
    constructor(
      body: T,
      options?: {
        status?: number;
        headers?: Record<string, string | readonly string[]>;
      },
    );
  }

  export function response<T>(
    body: T,
    options?: {
      status?: number;
      headers?: Record<string, string | readonly string[]>;
    },
  ): HttpResponse<T>;

  export interface HttpPluginOpenApiOptions {
    enabled?: boolean;
    jsonPath?: string;
    title: string;
    version: string;
    description?: string;
    transformDocument?: (
      document: Record<string, unknown>,
    ) => Record<string, unknown>;
    onDocumentGenerated?: (document: Record<string, unknown>) => void;
  }

  export interface HttpPluginOptions {
    port?: number;
    host?: string;
    openApi?: HttpPluginOpenApiOptions;
  }

  export function createHttpPlugin(options?: HttpPluginOptions): Plugin;

  export function httpProvider<T>(
    token: Token<T>,
    implementation: new (...args: any[]) => T,
    deps?: readonly Token<any>[],
  ): Provider<T>;
}
