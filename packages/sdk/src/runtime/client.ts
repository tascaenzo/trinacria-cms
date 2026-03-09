import { CmsSdkConfigurationError, CmsSdkHttpError } from "./errors.js";
import { createFetchTransport } from "./transport.js";
import type {
  CmsSdkClientCore,
  CmsSdkClientOptions,
  SdkOperationRequest,
  SdkTransport,
} from "./types.js";

/**
 * Low-level SDK client used by generated operation groups.
 */
export function createCmsSdkClientCore(
  options: CmsSdkClientOptions,
): CmsSdkClientCore {
  const transport: SdkTransport =
    options.transport ?? createFetchTransport(options.fetch);
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const apiKeyHeaderName = (options.apiKeyHeaderName ?? "x-api-key").trim().toLowerCase();

  return {
    async request<TData = unknown>(request: SdkOperationRequest): Promise<TData> {
      const url = buildUrl(baseUrl, request.path, request.pathParams, request.query);
      const defaultHeaders = (await options.getDefaultHeaders?.()) ?? {};
      const accessToken = await options.getAccessToken?.();
      const apiKey = (await options.getApiKey?.()) ?? options.apiKey;
      const headers: Record<string, string> = {
        accept: "application/json",
        ...defaultHeaders,
        ...(request.headers ?? {}),
      };

      if (accessToken && !headers.authorization) {
        headers.authorization = `Bearer ${accessToken}`;
      }
      if (apiKey && !headers[apiKeyHeaderName]) {
        headers[apiKeyHeaderName] = apiKey;
      }

      let body: string | undefined;
      if (request.body !== undefined) {
        body = JSON.stringify(request.body);
        if (!headers["content-type"]) {
          headers["content-type"] = "application/json";
        }
      }

      const response = await transport.request<TData>({
        url,
        method: request.method,
        headers,
        body,
        credentials: request.credentials ?? options.credentials,
        signal: request.signal,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new CmsSdkHttpError({
          status: response.status,
          data: response.data,
          headers: response.headers,
          method: request.method,
          url,
        });
      }

      return response.data;
    },
  };
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/g, "");
}

function buildUrl(
  baseUrl: string,
  path: string,
  pathParams?: Record<string, unknown>,
  query?: Record<string, unknown>,
): string {
  const interpolatedPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, key: string) => {
    const value = pathParams?.[key];
    if (value === undefined || value === null) {
      throw new Error(`Missing path param "${key}" for "${path}"`);
    }
    return encodeURIComponent(String(value));
  });

  const target = `${baseUrl}${interpolatedPath}`;
  const url = createUrl(target);
  appendQuery(url, query);

  if (isAbsoluteUrl(target)) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function createUrl(value: string): URL {
  if (isAbsoluteUrl(value)) {
    return new URL(value);
  }

  if (typeof window !== "undefined" && typeof window.location !== "undefined") {
    return new URL(value, window.location.origin);
  }

  throw new CmsSdkConfigurationError(
    `Relative SDK baseUrl "${value}" requires a browser environment. Use an absolute baseUrl in non-browser runtimes.`,
  );
}

function isAbsoluteUrl(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
}

function appendQuery(url: URL, query: Record<string, unknown> | undefined): void {
  if (!query) return;

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        url.searchParams.append(key, String(item));
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }
}
