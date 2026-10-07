import { PUBLICATION_POINTERS_ENTITY, PUBLICATION_SNAPSHOTS_ENTITY } from "../src/modules/publications/publications.schemas.js";
import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { type DbAdapter } from "@trinacria-cms/kernel";
import { createMongoDbAdapter, EntityRegistry, buildPhysicalCollectionName } from "@trinacria-cms/kernel/runtime";
import { CONTENT_TYPES_ENTITY } from "../src/modules/content-types/content-types.schemas.js";
import { ContentTypesRepository } from "../src/modules/content-types/repositories/content-types.repository.js";
import { ContentTypesService } from "../src/modules/content-types/services/content-types.service.js";
import { ENTRIES_ENTITY } from "../src/modules/entries/entries.schemas.js";
import { EntriesRepository } from "../src/modules/entries/repositories/entries.repository.js";
import { EntriesService } from "../src/modules/entries/services/entries.service.js";
import { createUserOperationContext } from "@trinacria-cms/kernel/runtime";
import { CoreOperationAuthorizer } from "@trinacria-cms/core-pack/runtime";
import { EditorialEntryOperations } from "../src/operations/editorial-entry-operations.js";
import { createContentTypeOperations } from "../src/operations/content-type-operations.js";
import { ENTRY_REVISIONS_ENTITY } from "../src/modules/revisions/revisions.schemas.js";
import { RevisionsRepository } from "../src/modules/revisions/revisions.repository.js";

const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";

test("editorial Mongo invariants, access policies, atomic history and schema safety", {
  skip: enabled ? false : "Set TRINACRIA_RUN_MONGO_INTEGRATION=1 (replica set required)"
}, async (t) => {
  const dbName = `trinacria_editorial_${Date.now()}_integration`;
  const uri = process.env.MONGO_URI ?? "mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin";
  const connection = await mongoose.createConnection(uri, { dbName }).asPromise();
  try {
    const registry = new EntityRegistry();
    for (const entity of [CONTENT_TYPES_ENTITY, ENTRIES_ENTITY, ENTRY_REVISIONS_ENTITY, PUBLICATION_POINTERS_ENTITY, PUBLICATION_SNAPSHOTS_ENTITY]) registry.register(entity);
    const db = createMongoDbAdapter({ connection, entityRegistry: registry });
    const collection = connection.collection(buildPhysicalCollectionName({ pluginId: "editorial-pack" }, "entries"));
    await collection.createIndex({ contentTypeId: 1, slug: 1 }, {
      name: "entries_content_type_slug_unique", unique: true, sparse: true
    });
    await db.ensureIndexes("editorial-pack", ["content_types", "entries", "entry_revisions", "publication_pointers", "publication_snapshots"]);
    const typesRepository = new ContentTypesRepository(db);
    const types = new ContentTypesService(typesRepository, db);
    const repository = new EntriesRepository(db);
    const revisions = new RevisionsRepository(db);
    let policy = "own_entries";
    const settings = { getResolvedValueByKey: async () => ({ value: policy }) };
    const service = new EntriesService(repository, types, revisions, settings as never, db);
    const model = await types.createContentType({ key: "test-page", name: "Page", fields: [], workflowId: "direct" }, "manager");
    const owner = { actorUserId: "author", canAccessAll: false };
    const manager = { actorUserId: "manager", canAccessAll: true };
    const first = await service.createEntry({ contentTypeId: model.id, data: {}, title: "First" }, "author");
    const second = await service.createEntry({ contentTypeId: model.id, data: {}, title: "Second" }, "other");

    await t.test("optional slugs coexist and old sparse index is removed", async () => {
      assert.notEqual(first.id, second.id);
      assert.equal((await collection.indexes()).some((index) => index.name === "entries_content_type_slug_unique"), false);
      await service.createEntry({ contentTypeId: model.id, data: {}, slug: "unique" }, "author");
      await assert.rejects(service.createEntry({ contentTypeId: model.id, data: {}, slug: "unique" }, "author"));
    });
    await t.test("authors follow global and per-model policies; reviewers require assignment", async () => {
      await assert.rejects(service.getEntry(second.id, owner));
      assert.equal((await service.listEntries({}, owner)).every((entry) => entry.ownerUserId === "author"), true);
      policy = "all_entries";
      assert.equal((await service.getEntry(second.id, owner))?.id, second.id);
      const reviewer = { actorUserId: "reviewer", canAccessAll: false, canReviewAssigned: true, canUseAuthorScope: false };
      await assert.rejects(service.getEntry(second.id, reviewer));
      await service.updateEntry(second.id, { reviewerUserId: "reviewer" }, manager);
      assert.equal((await service.getEntry(second.id, reviewer))?.id, second.id);
      assert.equal((await service.listEntries({}, reviewer)).length, 1);
      policy = "by_content_type";
      await assert.rejects(service.getEntry(second.id, owner));
      await types.updateContentType(model.id, { ownershipScope: "all_entries" });
      assert.equal((await service.getEntry(second.id, owner))?.id, second.id);
      policy = "own_entries";
    });
    await t.test("concurrent snapshots have unique sequential numbers", async () => {
      await Promise.all(Array.from({ length: 5 }, () => service.createRevisionSnapshot(first.id, owner)));
      const history = await service.listRevisions(first.id, owner);
      assert.deepEqual(history?.map((revision) => revision.revisionNumber), [6, 5, 4, 3, 2, 1]);
    });
    await t.test("a failed history write rolls back entry insertion", async () => {
      const faulty: DbAdapter = {
        repository: db.repository.bind(db), beginTransaction: db.beginTransaction.bind(db), healthCheck: db.healthCheck.bind(db),
        withTransaction: (context, work) => db.withTransaction(context, async (scoped) => work({
          ...scoped,
          repository: (name, namespace) => {
            const records = scoped.repository(name, namespace);
            return name === "entry_revisions" ? { ...records, insertOne: async () => { throw new Error("Injected history failure"); } } : records;
          }
        }))
      };
      const failing = new EntriesService(repository, types, revisions, settings as never, faulty);
      const before = (await repository.list()).length;
      await assert.rejects(failing.createEntry({ contentTypeId: model.id, data: {} }, "author"), /Injected history failure/);
      assert.equal((await repository.list()).length, before);
    });
    await t.test("restore preserves workflow/publication and validates current data", async () => {
      await service.transitionEntry(first.id, "publish", manager);
      const published = (await service.listRevisions(first.id, manager))?.[0];
      assert.ok(published);
      await service.transitionEntry(first.id, "unpublish", manager);
      const restored = await service.restoreRevision(first.id, published.id, owner);
      assert.equal(restored?.status, "draft");
      await typesRepository.update(model.id, { fields: [{ key: "required_value", label: "Required", type: "text", required: true, multiple: false }] });
      await assert.rejects(service.restoreRevision(first.id, published.id, owner), /required/);
      await typesRepository.update(model.id, { fields: [] });
    });
    await t.test("application publication, initial published state and restore require publish", async () => {
      const context = createUserOperationContext("author");
      const authorizer = new CoreOperationAuthorizer({ can: async (request: { action: string }) => ({ allowed: ["create", "read", "update", "submit", "restore"].includes(request.action) }) } as never);
      const operations = new EditorialEntryOperations(service, authorizer);
      await assert.rejects(operations.transitionEntry(context, first.id, "publish"), (error: unknown) => (error as { code: string }).code === "operation_forbidden");
      await assert.rejects(operations.getEntry(context, second.id));
      const listed = await operations.listEntries(context, { limit: 1, offset: 1, accessFilter: {} } as never);
      assert.equal(listed.every((entry) => entry.ownerUserId === "author"), true);
      const publishedType = await types.createContentType({ key: "published-initial", name: "Initial public", fields: [], workflow: { preset: "custom", states: [{ key: "published", label: "Published", initial: true }], transitions: [] } }, "manager");
      await assert.rejects(operations.createEntry(context, { contentTypeId: publishedType.id, data: {} }), (error: unknown) => (error as { code: string }).code === "operation_forbidden");
      await service.transitionEntry(first.id, "publish", manager);
      const history = (await service.listRevisions(first.id, manager))!;
      await assert.rejects(operations.updateEntry(context, first.id, { title: "unsafe live edit" }), (error: unknown) => (error as { code: string }).code === "operation_forbidden");
      await assert.rejects(operations.restoreRevision(context, first.id, history[0].id), (error: unknown) => (error as { code: string }).code === "operation_forbidden");
      await service.transitionEntry(first.id, "unpublish", manager);
      const restored = await operations.restoreRevision(context, first.id, history[0].id);
      assert.equal(restored?.status, "draft");
      const modelOps = createContentTypeOperations(types, authorizer);
      await assert.rejects(modelOps.deleteContentType(context, publishedType.id), (error: unknown) => (error as { code: string }).code === "operation_forbidden");
    });
    await t.test("a concurrent workflow change conflicts, retries and cannot bypass publish", async () => {
      const raceModel = await types.createContentType({ key: "workflow-race", name: "Race", fields: [], workflow: { preset: "custom", states: [{ key: "draft", label: "Draft", initial: true }, { key: "in_review", label: "Review", initial: false }], transitions: [{ key: "submit", label: "Submit", from: "draft", to: "in_review", requiredPermission: "submit" }] } }, "manager");
      const entry = await service.createEntry({ contentTypeId: raceModel.id, data: {} }, "author");
      let release!: () => void, ready!: () => void, armed = true, reads = 0;
      const barrier = new Promise<void>((resolve) => { release = resolve; });
      const entered = new Promise<void>((resolve) => { ready = resolve; });
      const racing: DbAdapter = { ...db, repository: db.repository.bind(db), beginTransaction: db.beginTransaction.bind(db), healthCheck: db.healthCheck.bind(db), withTransaction: (namespace, work) => db.withTransaction!(namespace, async (scoped) => work({ ...scoped, repository: (name, scope) => {
        const repository = scoped.repository(name, scope);
        if (name !== "content_types") return repository;
        return { ...repository, findOne: async (query) => { const result = await repository.findOne(query); reads++; if (armed && result) { armed = false; ready(); await barrier; } return result; } };
      } })) };
      const events: unknown[] = [];
      const implementation = new EntriesService(repository, types, revisions, settings as never, racing);
      implementation.setPublisher({ emit: async (_name, payload) => { events.push(payload); } });
      const authorizer = new CoreOperationAuthorizer({ can: async (request: { action: string }) => ({ allowed: ["read", "update", "submit", "create"].includes(request.action) }) } as never);
      const operations = new EditorialEntryOperations(implementation, authorizer);
      const pending = operations.transitionEntry(createUserOperationContext("author"), entry.id, "submit");
      const rejected = assert.rejects(pending, (error: unknown) => (error as { code: string }).code === "operation_forbidden");
      await entered;
      try {
        await typesRepository.update(raceModel.id, { workflow: { preset: "custom", states: [{ key: "draft", label: "Draft", initial: true }, { key: "published", label: "Published", initial: false }], transitions: [{ key: "submit", label: "Submit", from: "draft", to: "published", requiredPermission: "submit" }] } });
      } finally { release(); }
      await rejected;
      assert.ok(reads >= 2, "transaction rereads its model on retry");
      assert.equal((await repository.findById(entry.id))?.status, "draft");
      assert.equal((await revisions.listByEntryId(entry.id)).length, 1);
      assert.equal(events.length, 0);
    });
    await t.test("concurrent model mutation and first entry creation cannot both use incompatible schemas", async () => {
      const raceModel = await types.createContentType({ key: "schema-race", name: "Schema race", fields: [] }, "manager");
      let release!: () => void, ready!: () => void, armed = true;
      const barrier = new Promise<void>((resolve) => { release = resolve; });
      const entered = new Promise<void>((resolve) => { ready = resolve; });
      const racing: DbAdapter = { ...db, repository: db.repository.bind(db), beginTransaction: db.beginTransaction.bind(db), healthCheck: db.healthCheck.bind(db), withTransaction: (namespace, work) => db.withTransaction!(namespace, async (scoped) => work({ ...scoped, repository: (name, scope) => {
        const records = scoped.repository(name, scope);
        return name !== "content_types" ? records : { ...records, findOne: async (query) => { const result = await records.findOne(query); if (armed && result) { armed = false; ready(); await barrier; } return result; } };
      } })) };
      const pending = new EntriesService(repository, types, revisions, settings as never, racing).createEntry({ contentTypeId: raceModel.id, data: {} }, "author");
      const rejected = assert.rejects(pending, /required/);
      await entered;
      try { await types.updateContentType(raceModel.id, { fields: [{ key: "new_required", label: "Required", type: "text", required: true, multiple: false }] }); } finally { release(); }
      await rejected;
      assert.equal((await repository.list({ contentTypeId: raceModel.id })).length, 0);
    });
    await t.test("populated models block destructive updates and deletion", async () => {
      await assert.rejects(types.updateContentType(model.id, { fields: [{ key: "mandatory", label: "Mandatory", type: "text", required: true, multiple: false }] }), /migrazione/);
      await assert.rejects(types.updateContentType(model.id, { workflowId: "review" }), /migrazione/);
      await assert.rejects(types.deleteContentType(model.id), /migra/);
      assert.equal((await types.updateContentType(model.id, { name: "Renamed" }))?.name, "Renamed");
    });
  } finally {
    await connection.dropDatabase();
    await connection.close();
  }
});
