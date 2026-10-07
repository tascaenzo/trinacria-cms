import { createHash } from "node:crypto";
import { s } from "@trinacria/schema";
import type { DbAdapter } from "../../contracts/db-adapter.js";
import { defineEntity } from "./entity-registry.js";
export const PUBLIC_REQUEST_LIMIT_ENTITY = defineEntity({
  ownerPluginId: "kernel",
  entityName: "public_request_limits",
  schema: s.object(
    {
      id: s.string(),
      count: s.number({ int: true, min: 0 }),
      purgeAt: s.date()
    },
    { strict: true }
  ),
  indexes: [
    { name: "delivery_rate_id", fields: { id: 1 }, unique: true },
    { name: "delivery_rate_ttl", fields: { purgeAt: 1 }, expireAfterSeconds: 0 }
  ]
});
export class PublicRequestLimitedError extends Error {
  readonly code = "rate_limited";
}
interface Bucket {
  id: string;
  count: number;
  purgeAt: Date;
}
export class PublicRequestLimiter {
  constructor(
    private readonly db: DbAdapter,
    private readonly now = Date.now
  ) {}
  async consume(clientId: string) {
    const window = Math.floor(this.now() / 60000);
    const id = `${window}:${createHash("sha256").update(clientId).digest("hex")}`;
    if (!this.db.withTransaction)
      throw new Error("Shared delivery rate limiter requires transactions");
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.db.withTransaction({ pluginId: "kernel" }, async (db) => {
          const repository = db.repository<Bucket>("public_request_limits", {
            pluginId: "kernel"
          });
          const current = await repository.findOne({ filter: { id } });
          if (!current)
            await repository.insertOne({ id, count: 1, purgeAt: new Date((window + 2) * 60000) });
          else {
            if (current.count >= 120)
              throw new PublicRequestLimitedError("Public request limit exceeded");
            if (
              !(await repository.updateOne(
                { filter: { id, count: current.count } },
                { count: current.count + 1 }
              ))
            )
              throw new Error("Delivery rate counter conflict");
          }
        });
        return;
      } catch (error) {
        if (
          attempt < 2 &&
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === 11000
        )
          continue;
        throw error;
      }
    }
  }
}
