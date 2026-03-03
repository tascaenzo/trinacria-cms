import { CoreError } from "./core-error.js";

/**
 * Raised when a DB adapter operation fails or is misconfigured.
 */
export class DbAdapterError extends CoreError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("DB_ADAPTER_ERROR", message, { details });
  }
}
