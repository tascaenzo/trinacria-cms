export type SdkPrimitive = string | number | boolean | null;

export type SdkQueryValue = SdkPrimitive | readonly SdkPrimitive[] | undefined;

export interface SdkRequestOverrides {
  headers?: Record<string, string>;
  credentials?: "include" | "omit" | "same-origin";
  signal?: unknown;
}

export interface SdkOperationRequest {
  method: string;
  path: string;
  pathParams?: Record<string, SdkPrimitive>;
  query?: Record<string, SdkQueryValue>;
  headers?: Record<string, string>;
  body?: unknown;
  credentials?: "include" | "omit" | "same-origin";
  signal?: unknown;
}

export interface SdkTransportRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  credentials?: "include" | "omit" | "same-origin";
  signal?: unknown;
}

export interface SdkTransportResponse<TData = unknown> {
  status: number;
  headers: Record<string, string>;
  data: TData;
}

export interface SdkTransport {
  request<TData = unknown>(request: SdkTransportRequest): Promise<SdkTransportResponse<TData>>;
}

export interface CmsSdkClientOptions {
  baseUrl: string;
  transport?: SdkTransport;
  fetch?: FetchLike;
  requestTimeoutMs?: number;
  apiKey?: string;
  apiKeyHeaderName?: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  getApiKey?: () => string | undefined | Promise<string | undefined>;
  getDefaultHeaders?: () =>
    | Record<string, string>
    | undefined
    | Promise<Record<string, string> | undefined>;
  credentials?: "include" | "omit" | "same-origin";
}

export interface FetchHeadersLike {
  forEach(callback: (value: string, key: string) => void): void;
}

export interface FetchResponseLike {
  status: number;
  headers: FetchHeadersLike;
  text(): Promise<string>;
}

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    credentials?: "include" | "omit" | "same-origin";
    signal?: unknown;
  }
) => Promise<FetchResponseLike>;

export interface CmsSdkClientCore {
  request<TData = unknown>(request: SdkOperationRequest): Promise<TData>;
}
