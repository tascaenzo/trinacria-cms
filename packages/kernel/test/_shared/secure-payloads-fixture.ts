import type { DbAdapter, DbRepository } from "../../src/contracts/index.js";
import { matchesMongoFilter } from "../../../../test/helpers/mongo-like-filter.js";

export function vaultDb() {
  const records = new Map<string, Record<string, unknown>>(); let sequence = 0;
  const repo: DbRepository<any> = {
    async findOne(query) { const row = [...records.values()].find((row) => matchesMongoFilter(row, query.filter)); return row ? (query.parse ? query.parse(structuredClone(row)) : structuredClone(row)) : null; },
    async findMany(query) { return [...records.values()].filter((row) => matchesMongoFilter(row, query.filter)).slice(0, query.limit).map((row) => query.parse ? query.parse(structuredClone(row)) : structuredClone(row)); },
    async insertOne(data) { const row = { ...structuredClone(data), id: `payload-${++sequence}` }; records.set(row.id, row); return structuredClone(row); },
    async updateOne(query, patch) { const row = [...records.values()].find((row) => matchesMongoFilter(row, query.filter)); if (!row) return null; const updated = { ...row, ...structuredClone(patch) }; records.set(row.id as string, updated); return structuredClone(updated); },
    async deleteOne(query) { const row = [...records.values()].find((row) => matchesMongoFilter(row, query.filter)); return row ? records.delete(row.id as string) : false; }
  };
  const db: DbAdapter = { repository: () => repo, async ensureIndexes() {}, async beginTransaction() { throw new Error("unused"); }, async healthCheck() { return { ok: true }; } };
  return { db, records, repo };
}
