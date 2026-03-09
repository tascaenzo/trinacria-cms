export class CmsSdkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
  }
}

export class CmsSdkConfigurationError extends CmsSdkError {}

export class CmsSdkHttpError<TData = unknown> extends CmsSdkError {
  readonly status: number;
  readonly data: TData;
  readonly headers: Record<string, string>;
  readonly method: string;
  readonly url: string;

  constructor(input: {
    status: number;
    data: TData;
    headers: Record<string, string>;
    method: string;
    url: string;
  }) {
    super(`HTTP ${input.status} for ${input.method.toUpperCase()} ${input.url}`);
    this.status = input.status;
    this.data = input.data;
    this.headers = input.headers;
    this.method = input.method;
    this.url = input.url;
  }
}
