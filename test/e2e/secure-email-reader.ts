import mongoose from "mongoose";
import { E2E_MONGO_URI, E2E_SECURE_PAYLOAD_KEY } from "./e2e-env.js";

interface SecureEmailPayload {
  to: string;
  templateKey: string;
  locale: string;
  variables: Record<string, string>;
}

interface StoredSecurePayload {
  id: string;
  encryptedPayload: import("@trinacria-cms/kernel/contracts").EncryptedSecurePayload;
}

export async function readLatestSecureEmail(
  email: string,
  templateKey: string
): Promise<SecureEmailPayload> {
  const { buildPhysicalCollectionName, SecureEventPayloadCrypto } = await import("@trinacria-cms/kernel/runtime");
  const crypto = new SecureEventPayloadCrypto({ activeKeyId: "e2e-v1", keys: { "e2e-v1": E2E_SECURE_PAYLOAD_KEY } });
  const connection = await mongoose.createConnection(E2E_MONGO_URI).asPromise();
  try {
    const records = await connection
      .collection<StoredSecurePayload>(
        buildPhysicalCollectionName({ pluginId: "kernel" }, "secure_event_payloads")
      )
      .find({ payloadType: "email-pack:send-email-request" })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    for (const record of records) {
      const payload = JSON.parse(crypto.decrypt(record.encryptedPayload)) as SecureEmailPayload;
      if (payload.to === email && payload.templateKey === templateKey) {
        const jobs = connection.collection(buildPhysicalCollectionName({ pluginId: "kernel" }, "secure_email_jobs"));
        const deadline = Date.now() + 15000;
        while (Date.now() < deadline) {
          const job = await jobs.findOne({ "claim.payloadId": record.id }, { projection: { _id: 0, status: 1, reason: 1 } });
          if (job?.status === "succeeded") return payload;
          if (job && ["ambiguous", "blocked", "cancelled"].includes(job.status)) throw new Error(`Email job ${job.status}: ${job.reason}`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Email job was not confirmed for template ${templateKey}`);
      }
    }

    throw new Error(`Secure email payload not found for ${email} and template ${templateKey}`);
  } finally {
    await connection.close();
  }
}

export function extractFlowToken(url: string): string {
  const token = new URL(url).searchParams.get("token");
  if (!token) throw new Error(`Flow token missing from URL: ${url}`);
  return token;
}
