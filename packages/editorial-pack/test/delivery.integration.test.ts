import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import http from "@trinacria/http";
import serverRuntime from "@trinacria/http/dist/server/http-server.js";
import mongoose from "mongoose";
import { CoreOperationAuthorizer } from "@trinacria-cms/core-pack/runtime";
import { createMongoDbAdapter, EntityRegistry, MongoDurableEventStore, PublicRequestLimiter, registerPlatformEntities } from "@trinacria-cms/kernel/runtime";
import { LocalDiskMediaStorageProvider, MEDIA_ACL_ENTRIES_ENTITY, MEDIA_ASSETS_ENTITY, MEDIA_DIRECTORIES_ENTITY, MediaAssetsRepository, MediaAssetsService, MediaProviderRegistry } from "@trinacria-cms/media-pack/runtime";
import { MediaPublicDeliveryController } from "../../media-pack/src/modules/media/media-delivery.controller.js";
import { CONTENT_TYPES_ENTITY } from "../src/modules/content-types/content-types.schemas.js";
import { ContentTypesRepository } from "../src/modules/content-types/repositories/content-types.repository.js";
import { ContentTypesService } from "../src/modules/content-types/services/content-types.service.js";
import { ENTRIES_ENTITY } from "../src/modules/entries/entries.schemas.js";
import { EntriesRepository } from "../src/modules/entries/repositories/entries.repository.js";
import { EntriesService } from "../src/modules/entries/services/entries.service.js";
import { ENTRY_REVISIONS_ENTITY } from "../src/modules/revisions/revisions.schemas.js";
import { RevisionsRepository } from "../src/modules/revisions/revisions.repository.js";
import { EditorialDeliveryController } from "../src/modules/publications/delivery.controller.js";
import { EditorialDeliveryService } from "../src/modules/publications/delivery.service.js";
import { DELIVERY_CACHE_ENTITY, DELIVERY_CACHE_EPOCHS_ENTITY, SharedDeliveryCache, invalidateDeliveryCache } from "../src/modules/publications/delivery-cache.js";
import { PUBLICATION_POINTERS_ENTITY, PUBLICATION_SNAPSHOTS_ENTITY } from "../src/modules/publications/publications.schemas.js";
import { PublicationsRepository } from "../src/modules/publications/publications.repository.js";
const { Router } = http;
const { HttpServer } = serverRuntime;

test("anonymous HTTP delivery exposes immutable projections, validates Media and rechecks before 304", { skip: process.env.TRINACRIA_RUN_MONGO_INTEGRATION !== "1" }, async () => {
  const connection = await mongoose.createConnection("mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin", { dbName: `trinacria_delivery_${randomUUID().replaceAll("-", "")}` }).asPromise();
  const root = await mkdtemp(join(tmpdir(), "trinacria-delivery-"));
  const registry = new EntityRegistry(); registerPlatformEntities(registry);
  for (const entity of [CONTENT_TYPES_ENTITY, ENTRIES_ENTITY, ENTRY_REVISIONS_ENTITY, PUBLICATION_POINTERS_ENTITY, PUBLICATION_SNAPSHOTS_ENTITY, DELIVERY_CACHE_ENTITY, DELIVERY_CACHE_EPOCHS_ENTITY, MEDIA_ASSETS_ENTITY, MEDIA_DIRECTORIES_ENTITY, MEDIA_ACL_ENTRIES_ENTITY]) registry.register(entity);
  const db = createMongoDbAdapter({ connection, entityRegistry: registry });
  const store = new MongoDurableEventStore(db, registry, { async describe(ownerPluginId, name, payload) { return { ownerPluginId, eventName: `${ownerPluginId}:${name}`, payloadVersion: 1, payload, recipients: [] }; }, async dispatch() { throw new Error("No consumer"); } }, { instanceId: "delivery-test" });
  const typesRepo = new ContentTypesRepository(db), types = new ContentTypesService(typesRepo, db), publications = new PublicationsRepository(db);
  const assets = new MediaAssetsService(new MediaAssetsRepository(db)), providers = new MediaProviderRegistry();
  const provider = new LocalDiskMediaStorageProvider({ rootDirectory: root }); providers.register(provider);
  const entries = new EntriesService(new EntriesRepository(db), types, new RevisionsRepository(db), undefined, db, undefined, false, store, publications, assets);
  entries.setPublisher({ async emit() { throw new Error("Use durable publisher"); } });
  const authorizer = new CoreOperationAuthorizer({ async can() { return { allowed: false }; }, async assert() { throw new Error("Anonymous user has no admin permission"); } });
  let now = Date.now(); const cache = new SharedDeliveryCache(db, () => now);
  const delivery = new EditorialDeliveryService(publications, typesRepo, assets, authorizer, undefined, cache);
  const limiter = new PublicRequestLimiter(db), router = new Router();
  for (const controller of [new EditorialDeliveryController(delivery, limiter), new MediaPublicDeliveryController(assets, providers, authorizer, limiter)]) for (const route of controller.routes()) router.register(route);
  const server = new HttpServer(router);
  try {
    await store.initialize();
    await db.ensureIndexes("editorial-pack", ["content_types", "entries", "entry_revisions", "publication_pointers", "publication_snapshots", "delivery_cache", "delivery_cache_epochs"]);
    await db.ensureIndexes("media-pack", ["assets", "directories", "acl_entries"]);
    await server.listen(0, "127.0.0.1");
    const port = (server as unknown as { server: import("node:http").Server }).server.address() as import("node:net").AddressInfo;
    const base = `http://127.0.0.1:${port.port}`;
    const model = await types.createContentType({ key: "article", name: "Article", workflowId: "direct", fields: [
      { key: "excerpt", label: "Excerpt", type: "text", multiple: false, required: false },
      { key: "secret", label: "Private notes", type: "text", multiple: false, required: false }
    ], delivery: { enabled: true, publicFields: ["excerpt"], exposeTitle: true, exposeBody: true, exposeSlug: true } }, "manager");
    const entry = await entries.createEntry({ contentTypeId: model.id, title: "Public title", slug: "hello", data: { excerpt: "Public excerpt", secret: "Never public" } }, "author");
    const scope = { actorUserId: "author", canAccessAll: false };
    const path = `${base}/v1/delivery/content-types/article/entries/hello`;
    assert.equal((await fetch(path)).status, 404);
    await entries.transitionEntry(entry.id, "publish", scope);
    const response = await fetch(path), first = await response.json();
    assert.equal(response.status, 200); assert.equal(first.data.title, "Public title");
    assert.deepEqual(first.data.data, { excerpt: "Public excerpt" });
    for (const key of ["ownerUserId", "reviewerUserId", "status", "version", "workflowId"]) assert.ok(!(key in first.data));
    const etag = response.headers.get("etag")!;
    const rows = await db.repository("delivery_cache", { pluginId: "editorial-pack" }).findMany({});
    assert.equal(rows.length, 1); assert.ok(!JSON.stringify(rows).includes("Never public"));
    const replica = new SharedDeliveryCache(db, () => now);
    assert.ok(await replica.get(String(rows[0]!.id)), "another replica sees the cache");
    now += 30001; assert.equal(await replica.get(String(rows[0]!.id)), null, "expiry checked even before Mongo TTL cleanup"); now -= 30001;
    const storage = { repository: (name: string) => db.repository(name, { pluginId: "editorial-pack" }) };
    await invalidateDeliveryCache(storage as never, { scope: "entry", id: entry.id }, "delivery-event");
    assert.equal(await replica.get(String(rows[0]!.id)), null, "durable scope invalidation reaches both replicas");
    assert.equal((await fetch(path, { headers: { "if-none-match": etag } })).status, 304);
    const working = await entries.updateEntry(entry.id, { expectedVersion: 2, title: "Working title" }, scope);
    assert.equal((await (await fetch(path)).json()).data.title, "Public title");
    await entries.publishSnapshot(entry.id, working!.version!, scope);
    const republished = await fetch(path, { headers: { "if-none-match": etag } });
    assert.equal(republished.status, 200); assert.notEqual(republished.headers.get("etag"), etag);
    assert.equal((await republished.json()).data.title, "Working title");
    await types.updateContentType(model.id, { delivery: { ...model.delivery!, exposeTitle: false } });
    assert.ok(!("title" in (await (await fetch(path)).json()).data));
    assert.equal((await fetch(`${base}/v1/delivery/content-types/article/entries?ownerUserId=author`)).status, 400);
    assert.equal((await fetch(`${base}/v1/delivery/content-types/article/entries?limit=101`)).status, 400);
    await entries.transitionEntry(entry.id, "unpublish", scope);
    assert.equal((await fetch(path, { headers: { "if-none-match": etag } })).status, 404);
    assert.equal((await (await fetch(`${base}/v1/delivery/content-types/article/entries`)).json()).data.length, 0);

    const content = Buffer.from("public media bytes");
    await provider.writeUpload("delivery-image", Readable.from([content]));
    await provider.completeUpload({ uploadId: "delivery-image", storageKey: "assets/image", contentType: "image/png", expectedByteSize: content.length });
    const asset = await assets.createAsset({ ownerUserId: "author", uploadedByUserId: "author", displayName: "Image", originalFilename: "image.png", mimeType: "image/png", byteSize: content.length, checksum: { algorithm: "sha256", value: createHash("sha256").update(content).digest("hex") }, providerId: provider.id, storageKey: "assets/image" });
    const image = await entries.createEntry({ contentTypeId: model.id, slug: "image", data: {}, body: { version: 1, blocks: [{ id: "img", type: "image", version: 1, data: { src: "https://external.example/bypass", assetId: asset.id, alt: "Image" } }] } }, "author");
    await assert.rejects(entries.transitionEntry(image.id, "publish", scope), /ready and public/);
    const mediaPath = `${base}/v1/delivery/media/${asset.id}`;
    assert.equal((await fetch(mediaPath)).status, 404);
    await assets.updateAssetVisibility(asset.id, "public"); await entries.transitionEntry(image.id, "publish", scope);
    const bytes = await fetch(mediaPath); assert.equal(bytes.status, 200); assert.deepEqual(Buffer.from(await bytes.arrayBuffer()), content);
    assert.equal(bytes.headers.get("cache-control"), "private, no-store"); assert.equal(bytes.headers.get("x-content-type-options"), "nosniff");
    const imagePath = `${base}/v1/delivery/content-types/article/entries/image`, projected = await fetch(imagePath);
    const imageTag = projected.headers.get("etag")!;
    assert.equal((await projected.json()).data.body.blocks[0].data.src, `/v1/delivery/media/${asset.id}`);
    await assets.updateAssetVisibility(asset.id, "private");
    assert.equal((await fetch(imagePath, { headers: { "if-none-match": imageTag } })).status, 404);
    assert.equal((await fetch(mediaPath)).status, 404);
    await types.updateContentType(model.id, { delivery: { ...model.delivery!, enabled: false } });
    assert.equal((await fetch(`${base}/v1/delivery/content-types/article/entries`)).status, 404);

    await types.updateContentType(model.id, { delivery: model.delivery! });
    await assets.updateAssetVisibility(asset.id, "public");
    const validate = assets.validateUse.bind(assets);
    let validations = 0;
    assets.validateUse = async (input) => {
      if (++validations === 2) await assets.updateAssetVisibility(asset.id, "private");
      return validate(input);
    };
    assert.equal(await delivery.get("article", "image"), null, "ACL revoked during projection must fail closed");
    assets.validateUse = async () => { throw new Error("Sensitive storage outage detail"); };
    const unavailable = await fetch(imagePath); assert.equal(unavailable.status, 503);
    assert.ok(!(await unavailable.text()).includes("Sensitive storage"));
    assets.validateUse = validate;
    await assets.updateAssetVisibility(asset.id, "public");

    const target = await types.createContentType({ key: "target", name: "Target", workflowId: "direct", fields: [], delivery: { ...model.delivery!, publicFields: [] } }, "manager");
    const privateTarget = await types.createContentType({ key: "private-target", name: "Private target", workflowId: "direct", fields: [] }, "manager");
    const child = await entries.createEntry({ contentTypeId: target.id, title: "Child", slug: "child", data: {} }, "author");
    await entries.transitionEntry(child.id, "publish", scope);
    const hidden = await entries.createEntry({ contentTypeId: privateTarget.id, slug: "hidden", data: {} }, "author");
    await entries.transitionEntry(hidden.id, "publish", scope);
    const relations = await types.createContentType({ key: "relations", name: "Relations", workflowId: "direct", fields: [
      { key: "links", label: "Links", type: "relation", multiple: true, required: false, config: { targetContentTypeId: target.id } },
      { key: "private_link", label: "Private", type: "relation", multiple: false, required: false, config: { targetContentTypeId: privateTarget.id } }
    ], delivery: { ...model.delivery!, publicFields: ["links", "private_link"] } }, "manager");
    const parent = await entries.createEntry({ contentTypeId: relations.id, slug: "parent", data: { links: [child.id], private_link: hidden.id } }, "author");
    await entries.transitionEntry(parent.id, "publish", scope);
    const relationPath = `${base}/v1/delivery/content-types/relations/entries/parent`;
    assert.equal((await (await fetch(relationPath)).json()).data.data.links[0].title, "Child");
    assert.ok(!("private_link" in (await (await fetch(relationPath)).json()).data.data));
    await entries.transitionEntry(child.id, "unpublish", scope);
    assert.deepEqual((await (await fetch(relationPath)).json()).data.data.links, []);

    const buckets = await db.repository("public_request_limits", { pluginId: "kernel" }).findMany({});
    assert.equal(buckets.length, 1);
    for (let count = Number(buckets[0]!.count); count < 119; count++) await limiter.consume("127.0.0.1");
    assert.equal((await fetch(mediaPath)).status, 200);
    const blocked = await fetch(imagePath, { headers: { "x-forwarded-for": "203.0.113.123" } });
    assert.equal(blocked.status, 429, "media and editorial share budget; spoofed proxy headers do not reset it");
    assert.equal(blocked.headers.get("retry-after"), "60");
  } finally { await server.close(); await store.close(); await connection.dropDatabase(); await connection.close(); await rm(root, { recursive: true, force: true }); }
});
