import {
  CmsSdkConfigurationError,
} from "./errors.js";
import type {
  FetchLike,
  SdkTransport,
  SdkTransportRequest,
  SdkTransportResponse,
} from "./types.js";

/**
 * Default zero-deps transport based on a Fetch-compatible implementation.
 * Browser apps can rely on native fetch; Node apps can inject undici fetch.
 */
export function createFetchTransport(fetchImpl?: FetchLike): SdkTransport {
  const resolvedFetch = fetchImpl ?? resolveGlobalFetch();

  return {
    async request<TData = unknown>(
      request: SdkTransportRequest,
    ): Promise<SdkTransportResponse<TData>> {
      const response = await resolvedFetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        credentials: request.credentials,
        signal: request.signal,
      });

      const headers = readHeaders(response.headers);
      const rawText = await response.text();
      const data = parseResponseBody<TData>(rawText, headers["content-type"]);

      return {
        status: response.status,
        headers,
        data,
      };
    },
  };
}

function resolveGlobalFetch(): FetchLike {
  const candidate = globalThis as {
    fetch?: FetchLike;
  };

  if (typeof candidate.fetch !== "function") {
    throw new CmsSdkConfigurationError(
      "No fetch implementation available. Pass `fetch` or a custom `transport` when creating the SDK client.",
    );
  }

  return candidate.fetch.bind(globalThis);
}

function readHeaders(headers: { forEach(callback: (value: string, key: string) => void): void }) {
  const normalized: Record<string, string> = {};
  headers.forEach((value, key) => {
    normalized[key.toLowerCase()] = value;
  });
  return normalized;
}

function parseResponseBody<TData>(
  rawText: string,
  contentType: string | undefined,
): TData {
  if (!rawText) {
    return undefined as TData;
  }

  if (contentType?.toLowerCase().includes("application/json")) {
    return JSON.parse(rawText) as TData;
  }

  return rawText as TData;
}
