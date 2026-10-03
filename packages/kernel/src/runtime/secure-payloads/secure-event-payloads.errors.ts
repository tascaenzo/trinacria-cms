import { CoreError } from "../../errors/core-error.js";

export class SecureEventPayloadError extends CoreError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, { details });
  }
}
