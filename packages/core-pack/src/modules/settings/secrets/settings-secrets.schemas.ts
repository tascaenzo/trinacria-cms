import { s, type Infer } from "@trinacria-cms/kernel";

export const EncryptedSecretPayloadSchema = s.object(
  {
    cipherText: s.string({ minLength: 1 }),
    iv: s.string({ minLength: 1 }),
    authTag: s.string({ minLength: 1 }),
    algorithm: s.enum(["aes-256-gcm"] as const),
    keyVersion: s.string({ trim: true, minLength: 1 })
  },
  { strict: true }
);

export type EncryptedSecretPayloadRecord = Infer<typeof EncryptedSecretPayloadSchema>;
