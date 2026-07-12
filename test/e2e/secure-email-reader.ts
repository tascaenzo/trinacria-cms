import { createDecipheriv, createHash } from "node:crypto";
import mongoose from "mongoose";
import { E2E_MONGO_URI, E2E_SECURE_PAYLOAD_KEY } from "./e2e-env.js";

interface SecureEmailPayload {
  to: string;
  templateKey: string;
  locale: string;
  variables: Record<string, string>;
}

interface StoredSecurePayload {
  encryptedPayload: {
    cipherText: string;
    iv: string;
    authTag: string;
  };
}

export async function readLatestSecureEmail(
  email: string,
  templateKey: string
): Promise<SecureEmailPayload> {
  const connection = await mongoose.createConnection(E2E_MONGO_URI).asPromise();
  try {
    const records = await connection
      .collection<StoredSecurePayload>("kernel__secure_event_payloads")
      .find({ payloadType: "email-pack:send-email-request" })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    for (const record of records) {
      const payload = JSON.parse(decryptPayload(record.encryptedPayload)) as SecureEmailPayload;
      if (payload.to === email && payload.templateKey === templateKey) return payload;
    }

    throw new Error(`Secure email payload not found for ${email} and template ${templateKey}`);
  } finally {
    await connection.close();
  }
}

function decryptPayload(payload: StoredSecurePayload["encryptedPayload"]): string {
  const key = createHash("sha256").update(E2E_SECURE_PAYLOAD_KEY, "utf8").digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.cipherText, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function extractFlowToken(url: string): string {
  const token = new URL(url).searchParams.get("token");
  if (!token) throw new Error(`Flow token missing from URL: ${url}`);
  return token;
}
