/**
 * Base error for the CMS core package.
 * All typed core errors extend this class and carry a stable error code.
 */
export class CoreError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    options?: {
      cause?: unknown;
      details?: Record<string, unknown>;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = code;
    this.details = options?.details;
  }
}
