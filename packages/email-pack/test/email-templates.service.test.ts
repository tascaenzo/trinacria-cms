import assert from "node:assert/strict";
import test from "node:test";
import type { DbAdapter, DbQuery, DbRepository, NamespaceContext } from "@trinacria-cms/kernel";
import { EmailTemplatesRepository } from "../src/modules/email-templates/repositories/email-templates.repository.js";
import { EmailTemplatesService } from "../src/modules/email-templates/services/email-templates.service.js";

test("EmailTemplatesService seeds default templates idempotently", async () => {
  const service = createEmailTemplatesService();

  const firstSeed = await service.seedDefaults();
  const secondSeed = await service.seedDefaults();
  const templates = await service.listTemplates();

  assert.equal(firstSeed.length, 4);
  assert.equal(secondSeed.length, 0);
  assert.equal(templates.length, 4);
  assert.ok(await service.getTemplate("reset_password", "it"));
  assert.ok(await service.getTemplate("user_invite", "it"));
  assert.ok(await service.getTemplate("email_verification", "it"));
  assert.ok(await service.getTemplate("generic_notification", "it"));
});

test("EmailTemplatesService renders active templates with variables and locale fallback", async () => {
  const service = createEmailTemplatesService();
  await service.seedDefaults();

  const rendered = await service.render({
    key: "reset_password",
    locale: "en",
    fallbackLocale: "it",
    variables: {
      recipientName: "Enzo",
      siteName: "Trinacria CMS",
      resetUrl: "https://example.com/reset/token",
      expiresAt: "27/06/2026 12:00"
    }
  });

  assert.equal(rendered.templateKey, "reset_password");
  assert.equal(rendered.locale, "it");
  assert.equal(rendered.subject, "Trinacria CMS - Reset password");
  assert.match(rendered.text, /Ciao Enzo/);
  assert.match(rendered.text, /https:\/\/example\.com\/reset\/token/);
  assert.match(rendered.html ?? "", /Scegli una nuova password/);
});

function createEmailTemplatesService(): EmailTemplatesService {
  return new EmailTemplatesService(new EmailTemplatesRepository(createFakeDbAdapter()));
}

function createFakeDbAdapter(): DbAdapter {
  const buckets = new Map<string, Array<Record<string, unknown>>>();
  let sequence = 0;

  const getBucket = (key: string) => {
    const existing = buckets.get(key);
    if (existing) return existing;
    const created: Array<Record<string, unknown>> = [];
    buckets.set(key, created);
    return created;
  };

  const repository = <TData extends Record<string, unknown>>(key: string): DbRepository<TData> => ({
    async findOne(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const found = bucket.find((item) => matchesFilter(item, query.filter)) ?? null;
      if (!found) return null;
      return query.parse ? query.parse(found) : found;
    },
    async findMany(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const filtered = bucket.filter((item) => matchesFilter(item, query.filter));
      const sorted = applySort(filtered, query.sort);
      const offset = query.offset ?? 0;
      const limit = query.limit ?? sorted.length;
      const sliced = sorted.slice(offset, offset + limit);
      return sliced.map((item) => (query.parse ? query.parse(item) : item));
    },
    async insertOne(data: Partial<TData>) {
      const bucket = getBucket(key) as TData[];
      const record = { ...data } as TData & { id?: string };
      if (!record.id) {
        sequence += 1;
        record.id = `${key}:${sequence}`;
      }
      bucket.push(record);
      return record;
    },
    async updateOne(query: DbQuery<TData>, patch: Partial<TData>) {
      const bucket = getBucket(key) as TData[];
      const index = bucket.findIndex((item) => matchesFilter(item, query.filter));
      if (index < 0) return null;
      const updated = {
        ...bucket[index],
        ...patch
      } as TData;
      bucket[index] = updated;
      return updated;
    },
    async deleteOne(query: DbQuery<TData>) {
      const bucket = getBucket(key) as TData[];
      const index = bucket.findIndex((item) => matchesFilter(item, query.filter));
      if (index < 0) return false;
      bucket.splice(index, 1);
      return true;
    }
  });

  return {
    repository<TData>(entityName: string, context: NamespaceContext): DbRepository<TData> {
      return repository(`${context.pluginId}:${entityName}`) as unknown as DbRepository<TData>;
    },
    async beginTransaction() {
      return {
        async commit() {},
        async rollback() {}
      };
    },
    async healthCheck() {
      return { ok: true };
    }
  };
}

function matchesFilter(
  item: Record<string, unknown>,
  filter: Record<string, unknown> | undefined
): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([key, value]) => item[key] === value);
}

function applySort<TData extends Record<string, unknown>>(
  values: readonly TData[],
  sort: Record<string, "asc" | "desc"> | undefined
): TData[] {
  if (!sort || Object.keys(sort).length === 0) return [...values];
  const [field, direction] = Object.entries(sort)[0]!;
  return [...values].sort((a, b) => {
    const aValue = String(a[field] ?? "");
    const bValue = String(b[field] ?? "");
    if (aValue === bValue) return 0;
    if (direction === "asc") {
      return aValue < bValue ? -1 : 1;
    }
    return aValue > bValue ? -1 : 1;
  });
}
