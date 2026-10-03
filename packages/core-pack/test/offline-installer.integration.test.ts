import assert from "node:assert/strict";
import test from "node:test";
import { CORE_TOKENS, valueProvider } from "@trinacria-cms/kernel";
import { createInMemoryPluginRuntimeStore, startCmsApp } from "@trinacria-cms/kernel/runtime";
import { CorePackOfflineInstallerModule } from "../src/modules/installation/offline-installer.module.js";
const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
test("offline installer mounts environmental HTTP only and never loads an async producer", { skip: !enabled }, async () => {
 let loaded = 0, writes = 0;
 const port = 30000 + Math.floor(Math.random() * 15000);
 const handle = await startCmsApp({ coreVersion: "0.1.0", http: { host: "127.0.0.1", port }, migrations: { allowStartupWithoutDb: true }, offlineInstallerModules: [CorePackOfflineInstallerModule], pluginRuntimeStore: createInMemoryPluginRuntimeStore(), globalProviders: [valueProvider(CORE_TOKENS.DB_ADAPTER, { async healthCheck() { return { ok: false as const, reason: "not-configured" }; }, repository() { writes++; throw new Error("No offline data access permitted"); }, async beginTransaction() { writes++; throw new Error("No offline transaction permitted"); } })], plugins: [{ manifest: { id: "offline-producer", version: "0.1.0", requiresCore: "*", events: { emits: [{ name: "created", version: 1, visibility: "public", delivery: "async" }] } }, onLoad() { loaded++; } }] });
 try {
   assert.equal(handle.startupMode, "installer"); assert.equal(loaded, 0); assert.equal(writes, 0);
   const status = await fetch(`http://127.0.0.1:${port}/v1/install/status`); assert.equal(status.status, 200); assert.equal((await status.json()).data.installed, false);
   const bootstrap = await fetch(`http://127.0.0.1:${port}/v1/install/bootstrap`, { method: "POST", headers: {"Content-Type": "application/json"}, body: "{}" }); assert.equal(bootstrap.status, 503); assert.equal((await bootstrap.json()).error.code, "platform_maintenance");
   assert.ok([404, 405].includes((await fetch(`http://127.0.0.1:${port}/v1/users`)).status)); assert.equal(handle.getHttpRouteInventory().some(route => route.path.startsWith("/v1/users")), false); assert.equal(loaded, 0); assert.equal(writes, 0);
   const health = await fetch(`http://127.0.0.1:${port}/health`); assert.equal(health.status, 200); const snapshot = await health.json(); assert.equal(snapshot.status, "down"); assert.ok(snapshot.issues.includes("durable:durable-store-not-initialized"));
 } finally { await handle.shutdown(); }
});
