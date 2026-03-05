import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const DERIVED_KEY_LENGTH = 64;

export interface PasswordHashResult {
  algorithm: "scrypt-v1";
  passwordHash: string;
  passwordSalt: string;
}

/**
 * Encapsulates password hashing and verification logic for local credentials.
 * The service is intentionally algorithm-versioned to support future migrations.
 */
export class PasswordHashingService {
  async hashPassword(password: string): Promise<PasswordHashResult> {
    const salt = randomBytes(16).toString("base64");
    const derived = (await scrypt(
      password,
      salt,
      DERIVED_KEY_LENGTH,
    )) as Buffer;

    return {
      algorithm: "scrypt-v1",
      passwordHash: derived.toString("base64"),
      passwordSalt: salt,
    };
  }

  async verifyPassword(
    password: string,
    credential: {
      algorithm: "scrypt-v1";
      passwordHash: string;
      passwordSalt: string;
    },
  ): Promise<boolean> {
    if (credential.algorithm !== "scrypt-v1") {
      throw new Error(`Unsupported password algorithm "${credential.algorithm}"`);
    }

    const derived = (await scrypt(
      password,
      credential.passwordSalt,
      DERIVED_KEY_LENGTH,
    )) as Buffer;
    const expected = Buffer.from(credential.passwordHash, "base64");
    if (expected.length !== derived.length) {
      return false;
    }
    return timingSafeEqual(expected, derived);
  }
}

