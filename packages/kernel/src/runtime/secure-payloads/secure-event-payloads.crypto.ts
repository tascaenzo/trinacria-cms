import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { EncryptedSecurePayload } from "../../contracts/secure-event-payloads.js";

export interface SecureEventPayloadCryptoOptions {
  masterKey?: string;
  keyVersion?: string;
  strictMasterKeyRequired?: boolean;
}

export class SecureEventPayloadCrypto {
  private readonly algorithm = "aes-256-gcm" as const;
  private readonly keyVersion: string;
  private readonly key: Buffer;

  constructor(options?: SecureEventPayloadCryptoOptions) {
    this.keyVersion = options?.keyVersion?.trim() || "v1";
    this.key = this.resolveKey(options?.masterKey, options?.strictMasterKeyRequired ?? false);
  }

  encrypt(plaintext: string): EncryptedSecurePayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintext, "utf8")),
      cipher.final()
    ]);

    return {
      cipherText: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      algorithm: this.algorithm,
      keyVersion: this.keyVersion
    };
  }

  decrypt(payload: Pick<EncryptedSecurePayload, "cipherText" | "iv" | "authTag">): string {
    const decipher = createDecipheriv(this.algorithm, this.key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.cipherText, "base64")),
      decipher.final()
    ]);
    return decrypted.toString("utf8");
  }

  private resolveKey(configured: string | undefined, strictMasterKeyRequired: boolean): Buffer {
    const envMasterKey =
      process.env.CMS_SECURE_PAYLOAD_MASTER_KEY ?? process.env.CMS_SETTINGS_MASTER_KEY;
    const source = configured ?? envMasterKey ?? "trinacria-cms-dev-secure-payload-key";
    if (!configured && !envMasterKey && strictMasterKeyRequired) {
      throw new Error("CMS_SECURE_PAYLOAD_MASTER_KEY is required by strict master key policy");
    }

    const normalized = source.trim();
    if (normalized.startsWith("base64:")) {
      const decoded = Buffer.from(normalized.slice("base64:".length), "base64");
      if (decoded.length === 32) return decoded;
    }

    return createHash("sha256").update(normalized, "utf8").digest();
  }
}
