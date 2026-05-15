import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface SettingsSecretsCryptoOptions {
  masterKey?: string;
  keyVersion?: string;
}

export interface EncryptedSecretPayload {
  cipherText: string;
  iv: string;
  authTag: string;
  algorithm: "aes-256-gcm";
  keyVersion: string;
}

/**
 * AES-256-GCM helper for settings secrets encryption.
 * This service is intentionally small and deterministic for easy auditing.
 */
export class SettingsSecretsCryptoService {
  private readonly algorithm = "aes-256-gcm" as const;
  private readonly keyVersion: string;
  private readonly key: Buffer;

  constructor(options?: SettingsSecretsCryptoOptions) {
    this.keyVersion = options?.keyVersion?.trim() || "v1";
    this.key = this.resolveKey(options?.masterKey);
  }

  encrypt(plaintext: string): EncryptedSecretPayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintext, "utf8")),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return {
      cipherText: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
      algorithm: this.algorithm,
      keyVersion: this.keyVersion
    };
  }

  decrypt(payload: { cipherText: string; iv: string; authTag: string }): string {
    const decipher = createDecipheriv(this.algorithm, this.key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.cipherText, "base64")),
      decipher.final()
    ]);

    return decrypted.toString("utf8");
  }

  private resolveKey(configured?: string): Buffer {
    const source =
      configured ?? process.env.CMS_SETTINGS_MASTER_KEY ?? "trinacria-cms-dev-master-key";
    const normalized = source.trim();

    if (normalized.startsWith("base64:")) {
      const decoded = Buffer.from(normalized.slice("base64:".length), "base64");
      if (decoded.length === 32) return decoded;
    }

    return createHash("sha256").update(normalized, "utf8").digest();
  }
}
