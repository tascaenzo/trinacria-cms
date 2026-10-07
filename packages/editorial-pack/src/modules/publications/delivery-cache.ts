import type { DbAdapter } from "@trinacria-cms/kernel";
import { type Infer, s } from "@trinacria-cms/kernel";
import type { PluginStorage } from "@trinacria-cms/kernel/contracts";
import { defineEntity } from "@trinacria-cms/kernel/runtime";
import { EditorialJsonObjectSchema } from "../entries/editorial-json.js";
import type { PublicEntry } from "./delivery.service.js";

const dependencySchema = s.object(
  {
    entryId: s.string(),
    snapshotId: s.string(),
    contentTypeId: s.string(),
    configVersion: s.number({ int: true, min: 1 })
  },
  { strict: true }
);
const cacheSchema = s.object(
  {
    id: s.string(),
    dto: EditorialJsonObjectSchema,
    dependencies: s.array(dependencySchema, { maxItems: 100 }),
    epochs: s.record(s.string(), s.string()),
    expiresAt: s.date()
  },
  { strict: true }
);
const epochSchema = s.object(
  { id: s.string(), eventId: s.string(), expiresAt: s.date() },
  { strict: true }
);
export const DELIVERY_CACHE_ENTITY = defineEntity({
  ownerPluginId: "editorial-pack",
  entityName: "delivery_cache",
  schema: cacheSchema,
  indexes: [
    { name: "delivery_cache_id", fields: { id: 1 }, unique: true },
    { name: "delivery_cache_ttl", fields: { expiresAt: 1 }, expireAfterSeconds: 0 }
  ]
});
export const DELIVERY_CACHE_EPOCHS_ENTITY = defineEntity({
  ownerPluginId: "editorial-pack",
  entityName: "delivery_cache_epochs",
  schema: epochSchema,
  indexes: [
    { name: "delivery_epochs_id", fields: { id: 1 }, unique: true },
    { name: "delivery_epochs_ttl", fields: { expiresAt: 1 }, expireAfterSeconds: 0 }
  ]
});
export interface DeliveryDependency {
  entryId: string;
  snapshotId: string;
  contentTypeId: string;
  configVersion: number;
}
const namespace = { pluginId: "editorial-pack" };
function scopes(dependencies: readonly DeliveryDependency[]) {
  return [
    ...new Set(
      dependencies.flatMap((item) => [
        `entry:${item.entryId}`,
        `content-type:${item.contentTypeId}`
      ])
    )
  ].sort();
}
/** Content cache only: each hit still requires current pointers, projections and Media ACL. */
export class SharedDeliveryCache {
  constructor(
    private readonly db: DbAdapter,
    private readonly now = Date.now
  ) {}
  private async epochs(ids: string[]) {
    const rows = await this.db
      .repository<Infer<typeof epochSchema>>("delivery_cache_epochs", namespace)
      .findMany({ filter: { id: { $in: ids } }, limit: 200, parse: epochSchema.parse });
    return Object.fromEntries(
      ids.map((id) => [id, rows.find((row) => row.id === id)?.eventId ?? ""])
    );
  }
  async get(id: string) {
    const record = await this.db
      .repository<Infer<typeof cacheSchema>>("delivery_cache", namespace)
      .findOne({ filter: { id }, parse: cacheSchema.parse });
    if (
      !record ||
      record.expiresAt.getTime() <= this.now() ||
      record.expiresAt.getTime() > this.now() + 30000
    )
      return null;
    if (
      JSON.stringify(await this.epochs(scopes(record.dependencies))) !==
      JSON.stringify(record.epochs)
    )
      return null;
    return { dto: record.dto as unknown as PublicEntry, dependencies: record.dependencies };
  }
  async put(id: string, dto: PublicEntry, dependencies: DeliveryDependency[]) {
    const record = cacheSchema.parse({
      id,
      dto,
      dependencies,
      epochs: await this.epochs(scopes(dependencies)),
      expiresAt: new Date(this.now() + 30000)
    });
    const repository = this.db.repository<Infer<typeof cacheSchema>>("delivery_cache", namespace);
    if (await repository.updateOne({ filter: { id } }, record)) return;
    try {
      await repository.insertOne(record);
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== 11000)
        throw error;
      await repository.updateOne({ filter: { id } }, record);
    }
  }
}
export const DeliveryInvalidationSchema = s.object(
  {
    scope: s.enum(["entry", "content-type"] as const),
    id: s.string({ minLength: 1, maxLength: 240 })
  },
  { strict: true }
);
/** Called only inside the durable delivery's fenced domain/inbox transaction. */
export async function invalidateDeliveryCache(
  storage: PluginStorage,
  payload: unknown,
  eventId: string
) {
  const input = DeliveryInvalidationSchema.parse(payload),
    id = `${input.scope}:${input.id}`;
  const repo = storage.repository("delivery_cache_epochs"),
    record = { id, eventId, expiresAt: new Date(Date.now() + 90 * 86400000) };
  if (!(await repo.updateOne({ filter: { id } }, record))) await repo.insertOne(record);
}
