import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import { createMongoDbAdapter, createUserOperationContext, EntityRegistry, MongoDurableEventStore, registerPlatformEntities } from "@trinacria-cms/kernel/runtime";
import { CONTENT_TYPES_ENTITY } from "../src/modules/content-types/content-types.schemas.js";
import { ContentTypesRepository } from "../src/modules/content-types/repositories/content-types.repository.js";
import { ContentTypesService } from "../src/modules/content-types/services/content-types.service.js";
import { ENTRIES_ENTITY } from "../src/modules/entries/entries.schemas.js";
import { EntriesRepository } from "../src/modules/entries/repositories/entries.repository.js";
import { EntriesService } from "../src/modules/entries/services/entries.service.js";
import { ENTRY_REVISIONS_ENTITY } from "../src/modules/revisions/revisions.schemas.js";
import { RevisionsRepository } from "../src/modules/revisions/revisions.repository.js";
import { PUBLICATION_POINTERS_ENTITY, PUBLICATION_SNAPSHOTS_ENTITY } from "../src/modules/publications/publications.schemas.js";
import { PublicationsRepository } from "../src/modules/publications/publications.repository.js";
import { EditorialEntryOperations } from "../src/operations/editorial-entry-operations.js";

test("publication snapshots stay immutable through working edits/restore and commit with revision, CAS and outbox", { skip: process.env.TRINACRIA_RUN_MONGO_INTEGRATION !== "1" }, async () => {
 const connection = await mongoose.createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", { dbName: `trinacria_publications_${randomUUID().replaceAll("-", "")}` }).asPromise();
 const registry = new EntityRegistry(); registerPlatformEntities(registry);
 for (const entity of [CONTENT_TYPES_ENTITY, ENTRIES_ENTITY, ENTRY_REVISIONS_ENTITY, PUBLICATION_POINTERS_ENTITY, PUBLICATION_SNAPSHOTS_ENTITY]) registry.register(entity);
 const db = createMongoDbAdapter({ connection, entityRegistry: registry }); let fail = false, failModel = false, publicMedia = false;
 const store = new MongoDurableEventStore(db, registry, {
   async describe(ownerPluginId, name, payload) { if (fail && name.includes("entry-published")) throw new Error("publication outbox unavailable"); if (failModel && name.includes("delivery-invalidated")) throw new Error("model invalidation unavailable"); return { ownerPluginId, eventName: `${ownerPluginId}:${name}`, payloadVersion: 1, payload, recipients: [] }; },
   async dispatch() { throw new Error("No consumer"); }
 }, { instanceId: "publication-integration" });
 const types = new ContentTypesService(new ContentTypesRepository(db), db, undefined, undefined, store), revisions = new RevisionsRepository(db);
 const publications = new PublicationsRepository(db), records = new EntriesRepository(db);
 const service = new EntriesService(records, types, revisions, undefined, db, undefined, false, store, publications, { async validateUse(input) { return input.references.map(reference => ({ assetId: reference.assetId, usable: publicMedia })); } });
 service.setPublisher({ async emit() { throw new Error("Must use transactional durable publisher"); } });
 const scope = { actorUserId: "author", canAccessAll: false };
 try {
   await store.initialize(); await db.ensureIndexes("editorial-pack", ["content_types", "entries", "entry_revisions", "publication_pointers", "publication_snapshots"]);
   const model = await types.createContentType({ key: "public-page", name: "Page", fields: [], workflowId: "direct", delivery: { enabled: true, publicFields: [], exposeTitle: true, exposeBody: true, exposeSlug: true } }, "manager");
   const entry = await service.createEntry({ contentTypeId: model.id, title: "Published title", slug: "article", data: {} }, "author");
   const first = await service.transitionEntry(entry.id, "publish", scope); assert.equal(first?.version, 2);
   const pointer1 = await publications.getPointer(entry.id); assert.equal(pointer1?.publicationVersion, 1);
   const snapshot1 = await publications.snapshot(pointer1!); assert.equal(snapshot1?.entry.title, "Published title");
   assert.ok(snapshot1?.publishedRevisionId);
   const working = await service.updateEntry(entry.id, { title: "Working title", expectedVersion: 2 }, scope);
   assert.equal((await publications.snapshot((await publications.getPointer(entry.id))!))?.entry.title, "Published title");
   const context = createUserOperationContext("author");
   const forbidden = new EditorialEntryOperations(service, { async assert(_context, target) { if (target.action === "publish") throw new Error("publish denied"); } });
   await assert.rejects(forbidden.publishSnapshot(context, entry.id, working!.version!), /publish denied/);
   fail = true; await assert.rejects(service.publishSnapshot(entry.id, working!.version!, scope), /outbox unavailable/);
   assert.equal((await records.findById(entry.id))?.version, working?.version);
   assert.equal((await publications.getPointer(entry.id))?.snapshotId, pointer1?.snapshotId);
   assert.equal((await revisions.listByEntryId(entry.id)).length, 2);
   fail = false; const republished = await service.publishSnapshot(entry.id, working!.version!, scope);
   const pointer2 = await publications.getPointer(entry.id); assert.equal(pointer2?.publicationVersion, 2);
   assert.equal((await publications.snapshot(pointer2!))?.entry.title, "Working title");
   await assert.rejects(service.publishSnapshot(entry.id, working!.version!, scope), { code: "conflict" });
   await service.restoreRevision(entry.id, snapshot1!.publishedRevisionId, scope);
   assert.equal((await publications.getPointer(entry.id))?.snapshotId, pointer2?.snapshotId);
   // Restore the whole disposable database, including ownership metadata, into a
   // different database. The public pointer must still select the last explicitly
   // published snapshot rather than the subsequently restored working copy.
   const restoredConnection = await mongoose.createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", { dbName: `trinacria_publications_restore_${randomUUID().replaceAll("-", "")}` }).asPromise();
   try {
     for (const collection of await connection.db!.listCollections({}, { nameOnly: true }).toArray()) {
       if (collection.name.startsWith("system.")) continue;
       const documents = await connection.db!.collection(collection.name).find().toArray();
       if (documents.length) await restoredConnection.db!.collection(collection.name).insertMany(documents);
     }
     const restoredDb = createMongoDbAdapter({ connection: restoredConnection, entityRegistry: registry });
     await restoredDb.ensureIndexes("editorial-pack", ["content_types", "entries", "entry_revisions", "publication_pointers", "publication_snapshots"]);
     const restoredPublications = new PublicationsRepository(restoredDb);
     const restoredPointer = await restoredPublications.getPointer(entry.id);
     assert.equal(restoredPointer?.snapshotId, pointer2?.snapshotId);
     assert.equal(restoredPointer?.publicationVersion, 2);
     assert.equal((await restoredPublications.snapshot(restoredPointer!))?.entry.title, "Working title");
     assert.equal((await new EntriesRepository(restoredDb).findById(entry.id))?.title, "Published title");
     assert.equal((await restoredPublications.snapshot(pointer1!))?.publishedRevisionId, snapshot1?.publishedRevisionId);
   } finally { await restoredConnection.dropDatabase(); await restoredConnection.close(); }
   await service.transitionEntry(entry.id, "unpublish", scope); assert.equal(await publications.getPointer(entry.id), null);
   await service.transitionEntry(entry.id, "publish", scope); assert.equal((await publications.getPointer(entry.id))?.publicationVersion, 3);
   assert.equal((await publications.snapshot(pointer1!))?.entry.title, "Published title");
   const dangerous = await service.createEntry({ contentTypeId: model.id, slug: "unsafe", data: {}, body: { version: 1, blocks: [{ id: "p", type: "paragraph", version: 1, data: { text: "link", inline: [{ text: "link", link: { href: "javascript:alert(1)" } }] } }] } }, "author");
   await assert.rejects(service.transitionEntry(dangerous.id, "publish", scope), /Unsafe public link/);
   assert.equal((await records.findById(dangerous.id))?.status, "draft"); assert.equal(await publications.getPointer(dangerous.id), null);
   const image = await service.createEntry({ contentTypeId: model.id, slug: "media", data: {}, body: { version: 1, blocks: [{ id: "img", type: "image", version: 1, data: { src: "https://must-not-bypass.example/image", assetId: "asset", alt: "Image" } }] } }, "author");
   await assert.rejects(service.transitionEntry(image.id, "publish", scope), /ready and public/);
   publicMedia = true; await service.transitionEntry(image.id, "publish", scope);
   await service.deleteEntry(image.id, scope); assert.equal(await publications.getPointer(image.id), null);
   const defaults = await types.createContentType({ key: "private-model", name: "Private", fields: [], workflowId: "direct" }, "manager");
   assert.equal(defaults.delivery?.enabled, false);
   await assert.rejects(types.updateContentType(model.id, { delivery: { enabled: true, publicFields: ["missing"], exposeTitle: true, exposeBody: true, exposeSlug: true } }), /declared fields/);
   const before = await types.getContentType(model.id); failModel = true;
   await assert.rejects(types.updateContentType(model.id, { delivery: { ...model.delivery!, exposeTitle: false } }), /invalidation unavailable/);
   assert.equal((await types.getContentType(model.id))?.deliveryConfigVersion, before?.deliveryConfigVersion);
   assert.equal((await types.getContentType(model.id))?.delivery?.exposeTitle, true);
   failModel = false; await types.updateContentType(model.id, { delivery: { ...model.delivery!, exposeTitle: false } });
   assert.equal((await types.getContentType(model.id))?.deliveryConfigVersion, before!.deliveryConfigVersion! + 1);
   assert.ok(republished?.version);
 } finally { await store.close(); await connection.dropDatabase(); await connection.close(); }
});
