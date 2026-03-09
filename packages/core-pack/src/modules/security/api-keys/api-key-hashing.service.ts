import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface IssuedApiKeyMaterial {
  lookupId: string;
  keyPrefix: string;
  rawKey: string;
  secretHash: string;
  secretPreview: string;
}

/**
 * API keys are high-entropy machine credentials, so a fast one-way digest is
 * appropriate here unlike end-user passwords.
 */
export class ApiKeyHashingService {
  issue(): IssuedApiKeyMaterial {
    const lookupId = randomBytes(6).toString("hex");
    const secret = randomBytes(24).toString("base64url");
    const rawKey = `cms_sk_${lookupId}_${secret}`;

    return {
      lookupId,
      keyPrefix: `cms_sk_${lookupId}`,
      rawKey,
      secretHash: this.hash(rawKey),
      secretPreview: secret.slice(-6),
    };
  }

  hash(rawKey: string): string {
    return createHash("sha256").update(rawKey.trim()).digest("hex");
  }

  verify(rawKey: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hash(rawKey), "utf8");
    const expected = Buffer.from(expectedHash.trim(), "utf8");
    if (actual.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(actual, expected);
  }

  extractLookupId(rawKey: string): string | null {
    const normalized = rawKey.trim();
    const match = /^cms_sk_([a-z0-9]+)_[A-Za-z0-9_-]+$/.exec(normalized);
    return match?.[1] ?? null;
  }
}
