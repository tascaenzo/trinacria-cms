import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type {
  EncryptedSecurePayload,
  SecurePayloadKeyring
} from "../../contracts/secure-event-payloads.js";
import { SecureEventPayloadError } from "./secure-event-payloads.errors.js";

export class SecureEventPayloadCrypto {
  private readonly keys = new Map<string, Buffer>();
  readonly activeKeyId: string;

  constructor(keyring: SecurePayloadKeyring) {
    const invalid = () =>
      new SecureEventPayloadError(
        "secure_event_payload_key_unavailable",
        "A valid secure payload keyring is required"
      );
    if (!keyring || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(keyring.activeKeyId ?? ""))
      throw invalid();
    this.activeKeyId = keyring.activeKeyId;
    if (!keyring.keys || typeof keyring.keys !== "object" || Array.isArray(keyring.keys))
      throw invalid();
    for (const [id, material] of Object.entries(keyring.keys)) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(id)) throw invalid();
      const key =
        typeof material === "string"
          ? decodeBase64(material)
          : material instanceof Uint8Array
            ? Buffer.from(material)
            : null;
      // Reject malformed material and obvious repeated/text placeholders. Randomness
      // must be provided by the operator's CSPRNG; it cannot be proved from one key.
      if (
        !key ||
        key.length !== 32 ||
        new Set(key).size < 8 ||
        /(?:change.?me|replace|placeholder|trinacria|example|password|secret)/i.test(
          key.toString("utf8")
        )
      )
        throw invalid();
      this.keys.set(id, Buffer.from(key));
    }
    if (!this.keys.has(this.activeKeyId)) throw invalid();
  }

  encrypt(plaintext: string): EncryptedSecurePayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.keys.get(this.activeKeyId)!, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintext, "utf8")),
      cipher.final()
    ]);
    return {
      cipherText: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      algorithm: "aes-256-gcm",
      keyVersion: this.activeKeyId
    };
  }

  decrypt(payload: EncryptedSecurePayload): string {
    const key = this.keys.get(payload?.keyVersion);
    if (!key)
      throw new SecureEventPayloadError(
        "secure_event_payload_key_unavailable",
        "Secure payload key is unavailable"
      );
    try {
      const iv = decodeBase64(payload.iv);
      const tag = decodeBase64(payload.authTag);
      const ciphertext = decodeBase64(payload.cipherText);
      if (
        payload.algorithm !== "aes-256-gcm" ||
        !iv ||
        iv.length !== 12 ||
        !tag ||
        tag.length !== 16 ||
        !ciphertext
      )
        throw new Error();
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    } catch {
      throw new SecureEventPayloadError(
        "secure_event_payload_invalid_ciphertext",
        "Secure payload cannot be decrypted"
      );
    }
  }
}

function decodeBase64(value: string): Buffer | null {
  if (typeof value !== "string") return null;
  const bytes = Buffer.from(value, "base64");
  return bytes.toString("base64") === value ? bytes : null;
}

/** Host configuration only; never log environment text or key material in errors. */
export function readSecurePayloadKeyring(
  env: Record<string, string | undefined> = process.env
): SecurePayloadKeyring {
  try {
    const keys: unknown = JSON.parse(env.CMS_SECURE_PAYLOAD_KEYS_JSON ?? "");
    if (!keys || typeof keys !== "object" || Array.isArray(keys)) throw new Error();
    const result = {
      activeKeyId: env.CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID ?? "",
      keys: keys as Record<string, string>
    };
    new SecureEventPayloadCrypto(result);
    return result;
  } catch {
    throw new SecureEventPayloadError(
      "secure_event_payload_key_unavailable",
      "CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID and a valid CMS_SECURE_PAYLOAD_KEYS_JSON are required"
    );
  }
}
