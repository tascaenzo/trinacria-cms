import { createToken, type Token } from "@trinacria/core";

const CAPABILITY_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

/**
 * Creates a token with canonical naming for exported plugin capabilities.
 */
export function createCapabilityToken<T>(capabilityName: string): Token<T> {
  const normalized = capabilityName.trim();
  if (!normalized || !CAPABILITY_REGEX.test(normalized)) {
    throw new Error(
      `Invalid capability name "${capabilityName}". Expected lowercase dot/underscore/dash segments.`
    );
  }
  return createToken<T>(`CMS_CAPABILITY_${normalized}`);
}
