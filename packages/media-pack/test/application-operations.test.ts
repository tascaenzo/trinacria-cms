import assert from "node:assert/strict";
import test from "node:test";
import { CoreOperationAuthorizer } from "@trinacria-cms/core-pack/runtime";
import { createUserOperationContext, createPluginOperationContext, createDelegatedPluginOperationContext, operationForbidden } from "@trinacria-cms/kernel/runtime";
import { MediaAssetOperations, MediaDirectoryOperations, MediaUploadOperations } from "../src/operations/media-operations.js";
const user = createUserOperationContext("actual-owner");
const allow = { assert: async () => {} };
const deny = { assert: async () => { throw operationForbidden(); } };
const denied = (error: unknown) => (error as { code: string }).code === "operation_forbidden";

test("share, delete and signed URLs all require application permission and ACL", async () => {
  let writes = 0, urls = 0;
  const raw = { canAccessAsset: async () => true, replaceAssetShares: async () => { writes++; }, deleteAsset: async () => { writes++; }, getAsset: async () => ({ status: "ready", providerId: "local", storageKey: "secret" }) } as never;
  const providers = { get: () => ({ createReadUrl: async () => { urls++; } }) } as never;
  const operations = new MediaAssetOperations(raw, deny, providers);
  await assert.rejects(operations.replaceAssetShares(user, "asset", []), denied);
  await assert.rejects(operations.deleteAsset(user, "asset"), denied);
  await assert.rejects(operations.accessUrl(user, "asset"), denied);
  assert.equal(writes + urls, 0);
  const restricted = new MediaAssetOperations({ ...raw, canAccessAsset: async () => false } as never, allow, providers);
  await assert.rejects(restricted.accessUrl(user, "asset"), denied); assert.equal(urls, 0);
});

test("media ACL filtering precedes pagination and ignores a forged actor", async () => {
  const records = Array.from({ length: 105 }, (_, i) => ({ id: String(i) }));
  const principals: unknown[] = [];
  const operations = new MediaAssetOperations({ listAssets: async (options: { offset: number; limit: number }) => records.slice(options.offset, options.offset + options.limit), canAccessAsset: async (id: string, actor: { userId: string }) => { principals.push(actor); return Number(id) >= 100 && actor.userId === "actual-owner"; } } as never, allow, {} as never);
  assert.deepEqual((await operations.listAssets(user, { limit: 2, offset: 1 })).map((record) => record.id), ["101", "102"]);
  await operations.canAccessAsset(user, "103", "read");
  assert.deepEqual(principals.at(-1), { userId: "actual-owner" });
});

test("delegated media access requires both object ACLs as well as both permissions", async () => {
  const context = createDelegatedPluginOperationContext("caller", user);
  const authorizer = new CoreOperationAuthorizer({ can: async () => ({ allowed: true }) } as never, { canOperate: async () => ({ allowed: true }) });
  const operations = new MediaAssetOperations({ canAccessAsset: async (_id: string, actor: { userId?: string }) => actor.userId === "actual-owner", getAsset: async () => ({}) } as never, authorizer, {} as never);
  await assert.rejects(operations.getAsset(context, "asset"), denied);
});

test("replacement upload rechecks update permission at content and completion", async () => {
  let completes = 0, receives = 0, allowed = true;
  const operations = new MediaUploadOperations({ getOwnedSession: async (_id: string, owner: string) => { assert.equal(owner, "actual-owner"); return { replacementAssetId: "foreign" }; }, completeUpload: async () => { completes++; }, receiveContent: async () => { receives++; } } as never, { canAccessAsset: async () => true } as never, { assert: async (_ctx, target) => { if (target.action === "update" && !allowed) throw operationForbidden(); } });
  allowed = false;
  await assert.rejects(operations.completeUpload(user, { uploadId: "session", ownerUserId: "spoof" }), denied);
  await assert.rejects(operations.receiveContent(user, { uploadId: "session", ownerUserId: "spoof", body: {} as never }), denied);
  assert.equal(completes + receives, 0);
});

test("directory owner and share approver are fixed by the principal", async () => {
  const operations = new MediaDirectoryOperations({ createDirectory: async (input: { ownerUserId: string }) => { assert.equal(input.ownerUserId, "actual-owner"); return input; } } as never, {} as never, allow);
  await operations.createDirectory(user, { name: "folder", ownerUserId: "spoof" });
  const assets = new MediaAssetOperations({ canAccessAsset: async () => true, replaceAssetShares: async (_id: string, creator: string) => { assert.equal(creator, "plugin:caller"); return []; } } as never, allow, {} as never);
  await assets.replaceAssetShares(createPluginOperationContext("caller"), "asset", []);
});
