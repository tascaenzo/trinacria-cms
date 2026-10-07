import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { cp, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "@playwright/test";
import { createCorePackPlugin } from "@trinacria-cms/core-pack";
import {
  LocalCredentialsRepository,
  PasswordHashingService,
  UsersRepository
} from "@trinacria-cms/core-pack/runtime";
import { createEditorialPackPlugin } from "@trinacria-cms/editorial-pack";
import { createEmailPackPlugin } from "@trinacria-cms/email-pack";
import { createCatalogConsumer } from "@trinacria-cms/example-catalog-consumer";
import { CORE_TOKENS, valueProvider } from "@trinacria-cms/kernel";
import {
  createInMemoryPluginRuntimeStore,
  createMongoDbAdapter,
  EntityRegistry,
  InMemoryPluginRuntime,
  PluginMigrationRunner,
  PluginRemovalService,
  startCmsApp
} from "@trinacria-cms/kernel/runtime";
import { createMediaPackPlugin } from "@trinacria-cms/media-pack";
import { createCmsSdkClient } from "@trinacria-cms/sdk";
import { CATALOG_MANIFEST, createCatalogPlugin } from "catalog-plugin";
import mongoose from "mongoose";
import { restoreFixture, snapshotFixture } from "./catalog-recovery.mjs";

let context, browser, restoreConnection;
const measurements = {
  profile: "single-instance-local-mongo",
  node: process.version,
  startupMs: null,
  rssBytes: null,
  readLatency: null,
  recovery: null
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function login(base) {
  const response = await fetch(base + "/v1/auth/login", {
    signal: AbortSignal.timeout(20000),
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@catalog.example.test",
      password: process.env.CATALOG_ADMIN_PASSWORD
    })
  });
  assert.equal(response.status, 200);
  return (await response.json()).data.accessToken;
}
async function request(method, path, body, token = context?.token, base = context?.base) {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(20000),
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { status: response.status, body: await response.json() };
}
async function waitFor(work) {
  const until = Date.now() + 10000;
  while (Date.now() < until) {
    const result = await work();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Conformance effect did not reach persistent storage");
}
function definition(ctx, kind) {
  const plugin = kind === "catalog" ? createCatalogPlugin() : createCatalogConsumer();
  // This reviewed consumer fixture accepts the artifact under test; the shipped example keeps its narrower range.
  if (kind === "consumer")
    plugin.manifest = {
      ...plugin.manifest,
      dependencies: plugin.manifest.dependencies.map((dependency) =>
        dependency.pluginId === CATALOG_MANIFEST.id
          ? { ...dependency, versionRange: CATALOG_MANIFEST.version }
          : dependency
      )
    };
  const original = plugin.onLoad;
  plugin.onLoad = async (hook) => {
    await original(hook);
    ctx[kind + "Services"] = hook.services;
  };
  return plugin;
}
async function start(connection, port) {
  const registry = new EntityRegistry(),
    adapter = createMongoDbAdapter({ connection, entityRegistry: registry });
  const ctx = { connection, adapter, registry, port, base: `http://127.0.0.1:${port}` };
  ctx.handle = await startCmsApp({
    coreVersion: "0.1.0",
    plugins: [
      createCorePackPlugin(),
      createEmailPackPlugin(),
      createMediaPackPlugin(),
      createEditorialPackPlugin(),
      definition(ctx, "catalog"),
      definition(ctx, "consumer")
    ],
    globalProviders: [
      valueProvider(CORE_TOKENS.DB_ADAPTER, adapter),
      valueProvider(CORE_TOKENS.ENTITY_REGISTRY, registry)
    ],
    pluginRuntimeStore: createInMemoryPluginRuntimeStore(),
    migrations: {
      packageRoots: { "catalog-plugin": join(process.cwd(), "node_modules/catalog-plugin") }
    },
    durableEvents: { pollMs: 30 },
    http: {
      host: "127.0.0.1",
      port,
      openApi: { enabled: true, title: "Conformance", version: "1" }
    }
  });
  try {
    ctx.token = await login(ctx.base);
    return ctx;
  } catch (error) {
    await ctx.handle.shutdown();
    throw error;
  }
}
async function fixture() {
  if (context) return context;
  const state = JSON.parse(await readFile("catalog-state.json", "utf8"));
  assert.match(state.databaseName, /^trinacria_catalog_[a-f0-9]+_e2e$/);
  const uri = new URL(process.env.MONGO_URI);
  uri.pathname = "/" + state.databaseName;
  const connection = await mongoose.createConnection(uri.toString()).asPromise();
  const configuration = {
    CMS_JWT_SECRET: randomBytes(48).toString("hex"),
    CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID: "conformance",
    CMS_SECURE_PAYLOAD_KEYS_JSON: JSON.stringify({
      conformance: randomBytes(32).toString("base64")
    })
  };
  Object.assign(process.env, configuration);
  const started = performance.now();
  try {
    context = await start(connection, await freePort());
  } catch (error) {
    await connection.close();
    throw error;
  }
  context.state = state;
  context.configuration = configuration;
  // The previous fixture explicitly uninstalled this consumer. Reinstallation is an operator action,
  // including reopening its persisted writer fence; ordinary startup must never clear maintenance.
  await new PluginMigrationRunner(context.adapter, {
    instanceId: "conformance-reinstall",
    packageRoot: process.cwd()
  }).maintenance.set([{ pluginId: "catalog-consumer" }], false, "conformance-operator");
  measurements.startupMs = Math.round(performance.now() - started);
  measurements.plugins = context.handle.runtime.list().map((plugin) => plugin.manifest.id);
  measurements.rssBytes = process.memoryUsage().rss;
  const created = await request("POST", "/v1/catalog/items", {
    name: "Conformance item",
    priceCents: 1100
  });
  assert.equal(created.status, 200);
  assert.equal(typeof created.body.data.id, "string");
  context.item = created.body.data;
  return context;
}

export const tests = {
  async "negative-authz"() {
    const ctx = await fixture();
    assert.equal((await request("GET", "/v1/catalog/items", undefined, null)).status, 401);
    const user = await new UsersRepository(ctx.adapter).create({
      email: "conformance-viewer@example.test",
      firstName: "Conformance",
      lastName: "Viewer"
    });
    const password = randomBytes(20).toString("base64") + "aA1!";
    await new LocalCredentialsRepository(ctx.adapter).upsert({
      userId: user.id,
      ...(await new PasswordHashingService().hashPassword(password))
    });
    const response = await request("POST", "/v1/auth/login", { email: user.email, password }, null);
    assert.equal(response.status, 200);
    assert.equal(
      (
        await request(
          "POST",
          "/v1/catalog/items",
          { name: "Denied", priceCents: 1 },
          response.body.data.accessToken
        )
      ).status,
      403
    );
    assert.equal(
      (await request("POST", "/v1/catalog/items", { name: "Invalid", priceCents: -1 })).status,
      400
    );
    await assert.rejects(ctx.catalogServices.settings.get("core-pack:auth:mfa_mode"));
    assert.equal((await request("GET", "/v1/security/plugin-grants")).body.data.length, 0);
  },
  async lifecycle() {
    const ctx = await fixture();
    assert.ok(ctx.handle.runtime.list().every((plugin) => plugin.state === "loaded"));
    await assert.rejects(ctx.handle.runtime.reload("catalog-plugin"), /loaded dependents/);
    const observation = await waitFor(() =>
      ctx.adapter
        .repository("observations", { pluginId: "catalog-consumer" })
        .findOne({ filter: { itemId: ctx.item.id } })
    ).catch(async (error) => {
      const rows = await ctx.adapter
        .repository("event_deliveries", { pluginId: "kernel" })
        .findMany({ filter: { consumerPluginId: "catalog-consumer" } });
      const events = await ctx.adapter
        .repository("event_outbox", { pluginId: "kernel" })
        .findMany({ filter: { ownerPluginId: "catalog-plugin" } });
      console.error(
        JSON.stringify({
          diagnostic: "catalog-delivery",
          itemId: ctx.item.id,
          deliveries: rows.map((row) => ({
            status: row.status,
            reason: row.reason,
            eventId: row.eventId
          })),
          outbox: events.map((event) => ({
            id: event.id,
            payloadId: event.payload.id,
            state: event.state,
            recipients: event.recipients
          }))
        })
      );
      throw error;
    });
    assert.equal(typeof observation.id, "string");
    assert.equal(
      (
        await ctx.consumerServices.operations.call("catalog-consumer", "inspect", {
          id: ctx.item.id
        })
      ).id,
      ctx.item.id
    );
  },
  async "reload-cleanup"() {
    const ctx = await fixture();
    const stale = ctx.catalogServices;
    const originalRoutes = ctx.handle
      .getHttpRouteInventory()
      .filter((route) => route.path.startsWith("/v1/catalog/"));
    await ctx.handle.runtime.unload("catalog-consumer");
    await ctx.handle.runtime.reload("catalog-plugin");
    await assert.rejects(stale.settings.get("catalog-plugin:catalog:prefix"));
    await ctx.handle.runtime.load("catalog-consumer");
    assert.equal(
      ctx.handle.getHttpRouteInventory().filter((route) => route.path.startsWith("/v1/catalog/"))
        .length,
      originalRoutes.length
    );
    const created = await request("POST", "/v1/catalog/items", {
      name: "After reload",
      priceCents: 12
    });
    assert.equal(created.status, 200);
    const observations = await waitFor(async () => {
      const rows = await ctx.adapter
        .repository("observations", { pluginId: "catalog-consumer" })
        .findMany({ filter: { itemId: created.body.data.id } });
      return rows.length ? rows : null;
    });
    assert.equal(observations.length, 1);
  },
  async "missing-provider"() {
    const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
    await runtime.register(createCatalogConsumer());
    await assert.rejects(runtime.load("catalog-consumer"), /missing required dependency/);
    assert.notEqual(runtime.list()[0].state, "loaded");
    await runtime.unregister("catalog-consumer");
  },
  async headless() {
    const ctx = await fixture();
    await assert.rejects(lstat(join(process.cwd(), "node_modules/react")), { code: "ENOENT" });
    assert.equal((await request("GET", "/v1/catalog/items/" + ctx.item.id)).status, 200);
    const times = [];
    for (let index = 0; index < 55; index++) {
      const started = performance.now();
      assert.equal((await request("GET", "/v1/catalog/items/" + ctx.item.id)).status, 200);
      if (index >= 5) times.push(performance.now() - started);
    }
    times.sort((a, b) => a - b);
    measurements.readLatency = {
      requests: times.length,
      warmup: 5,
      concurrency: 1,
      medianMs: Number(times[24].toFixed(2)),
      p95Ms: Number(times[47].toFixed(2))
    };
  },
  async browser() {
    const ctx = await fixture();
    assert.ok(process.env.CONFORMANCE_FRONTEND_URL, "Frontend URL must be supplied explicitly");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((token) => {
      window.fixtureCatalogToken = token;
    }, ctx.token);
    // Forward actual requests to this fixture's live backend; no API response is mocked.
    await page.route("**/catalog-cms/**", async (route) => {
      try {
        const url = new URL(route.request().url());
        const response = await route.fetch({
          url: ctx.base + url.pathname.replace(/^\/catalog-cms/, "") + url.search
        });
        await route.fulfill({ response });
      } catch {
        // Browser network errors can include Authorization headers; keep diagnostics redacted.
        errors.push("Catalog proxy request failed");
        await route.abort().catch(() => {});
      }
    });
    await page.goto(process.env.CONFORMANCE_FRONTEND_URL);
    await page.getByRole("button", { name: "Edit Conformance item", exact: true }).waitFor();
    await page.getByLabel("Item name").fill("Conformance browser");
    await page.getByLabel("Price in cents").fill("4200");
    await page.getByRole("button", { name: "Create item", exact: true }).click();
    await page.getByRole("button", { name: "Edit Conformance browser", exact: true }).click();
    await page.getByLabel("Item name").fill("Conformance changed");
    await page.getByRole("button", { name: "Save item", exact: true }).click();
    const [deleted] = await Promise.all([
      page.waitForResponse((response) => response.request().method() === "DELETE"),
      page.getByRole("button", { name: "Delete Conformance changed", exact: true }).click()
    ]);
    assert.equal(deleted.status(), 200);
    await page
      .getByRole("button", { name: "Edit Conformance changed", exact: true })
      .waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Edit Conformance item", exact: true }).waitFor();
    await page.unrouteAll({ behavior: "wait" });
    assert.deepEqual(errors, []);
    await browser.close();
    browser = undefined;
  },
  async migration() {
    let ctx = await fixture();
    const runner = new PluginMigrationRunner(ctx.adapter, {
      instanceId: "conformance-migration",
      packageRoot: join(process.cwd(), "node_modules/catalog-plugin")
    });
    const plugin = createCatalogPlugin();
    await runner.verifyAppliedIntegrity(
      CATALOG_MANIFEST,
      plugin.migrations,
      { pluginId: "catalog-plugin" },
      true
    );
    assert.equal((await runner.plan(CATALOG_MANIFEST, plugin.migrations)).pending.length, 0);
    assert.equal((await runner.status({ pluginId: "catalog-plugin" }))[0].status, "applied");
    const before = (await request("GET", "/v1/catalog/items/" + ctx.state.itemId)).body.data;
    assert.equal(before.currency, "EUR");
    assert.equal(before.name, "Concurrent update");
    assert.equal(before.version, 3);
    const sdk = createCmsSdkClient({ baseUrl: ctx.base, getAccessToken: () => ctx.token });
    const mediaRoot = join(process.cwd(), "conformance-media");
    await sdk.settings.upsertSettingValue({
      path: { key: "media-pack:storage:local_root" },
      body: { value: mediaRoot }
    });
    // Storage providers resolve their configured root at startup; changing this setting requires restart.
    await ctx.handle.shutdown();
    ctx.handle = undefined;
    const previous = ctx;
    context = ctx = await start(previous.connection, previous.port);
    ctx.state = previous.state;
    ctx.item = previous.item;
    ctx.configuration = previous.configuration;
    const bytes = Buffer.from("CMS recovery: actual media bytes survive backup and cold start");
    const upload = await sdk.media.startMediaUpload({
      body: {
        filename: "recovery.txt",
        mimeType: "text/plain",
        byteSize: bytes.length,
        checksumSha256: digest(bytes)
      }
    });
    const path = { id: upload.data.session.id };
    await sdk.media.receiveMediaUploadContent({ path, body: bytes });
    const asset = (await sdk.media.completeMediaUpload({ path })).data;
    const access = await sdk.media.createMediaAccessUrl({ path: { id: asset.id } });
    const downloadUrl = new URL(access.data.url, ctx.base);
    const sourceBytes = await fetch(downloadUrl);
    assert.equal(sourceBytes.status, 200);
    assert.equal(digest(Buffer.from(await sourceBytes.arrayBuffer())), digest(bytes));
    await ctx.handle.shutdown();
    ctx.handle = undefined;
    const backupRoot = join(process.cwd(), "conformance-backup");
    const configuration = ctx.configuration;
    const backupStarted = performance.now();
    const snapshot = await snapshotFixture(ctx.connection, mediaRoot, configuration, backupRoot);
    await writeFile("catalog-progress.json", JSON.stringify({ stage: "backup-saved" }));
    const backupDurationMs = Math.round(performance.now() - backupStarted);
    const restoreStarted = performance.now();
    const restoreUri = new URL(process.env.MONGO_URI);
    restoreUri.pathname = "/" + ctx.connection.name.replace(/_e2e$/, "_restore");
    restoreConnection = mongoose.createConnection(restoreUri.toString());
    await restoreConnection.asPromise();
    const restoredMedia = join(process.cwd(), "conformance-restored-media");
    const restored = await restoreFixture(restoreConnection, backupRoot, restoredMedia);
    await writeFile("catalog-progress.json", JSON.stringify({ stage: "restore-saved" }));
    assert.equal(
      digest(JSON.stringify(restored.configuration)),
      digest(JSON.stringify(configuration))
    );
    // A restored host uses its own media root, while every object and storage key stays unchanged.
    await restoreConnection.db
      .collection("settings__plugin_core-pack")
      .updateOne(
        { kind: "value", key: "media-pack:storage:local_root" },
        { $set: { value: restoredMedia } }
      );
    const restoredCtx = await start(restoreConnection, await freePort());
    await writeFile("catalog-progress.json", JSON.stringify({ stage: "restore-started" }));
    try {
      const status = await request(
        "GET",
        "/v1/install/status",
        undefined,
        restoredCtx.token,
        restoredCtx.base
      );
      assert.equal(status.body.data.installed, true);
      assert.deepEqual(
        (
          await request(
            "GET",
            "/v1/catalog/items/" + ctx.state.itemId,
            undefined,
            restoredCtx.token,
            restoredCtx.base
          )
        ).body.data,
        before
      );
      const restoredSdk = createCmsSdkClient({
        baseUrl: restoredCtx.base,
        getAccessToken: () => restoredCtx.token
      });
      const restoredAccess = await restoredSdk.media.createMediaAccessUrl({
        path: { id: asset.id }
      });
      const download = await fetch(new URL(restoredAccess.data.url, restoredCtx.base));
      assert.equal(download.status, 200, "Restored media must be readable");
      assert.equal(digest(Buffer.from(await download.arrayBuffer())), digest(bytes));
      const health = await request(
        "GET",
        "/health",
        undefined,
        restoredCtx.token,
        restoredCtx.base
      );
      assert.equal(health.status, 200, "Restored kernel health must be reachable");
      assert.equal(
        health.body.status,
        "ok",
        "Restored runtime, DB and durable worker must be ready"
      );
    } finally {
      await restoredCtx.handle.shutdown();
    }
    measurements.recovery = {
      ...snapshot,
      backupDurationMs,
      restoreAndVerificationMs: Math.round(performance.now() - restoreStarted),
      installed: true,
      login: "passed",
      catalog: "passed",
      mediaSha256: digest(bytes),
      configuration: "restored",
      readiness: 200
    };
    context = await start(ctx.connection, ctx.port);
    context.state = ctx.state;
    context.item = ctx.item;
    assert.equal(
      (await request("GET", "/v1/catalog/items/" + ctx.state.itemId)).body.data.currency,
      "EUR"
    );
  },
  async "disable-remove-preserve"() {
    const ctx = await fixture();
    await ctx.handle.runtime.disable("catalog-consumer", "Conformance disable");
    await ctx.handle.runtime.disable("catalog-plugin", "Conformance disable");
    assert.equal(
      ctx.handle.getHttpRouteInventory().some((route) => route.path.startsWith("/v1/catalog/")),
      false
    );
    await ctx.handle.runtime.enable("catalog-plugin");
    await ctx.handle.runtime.enable("catalog-consumer");
    await ctx.handle.runtime.load("catalog-plugin");
    await ctx.handle.runtime.load("catalog-consumer");
    assert.equal((await request("GET", "/v1/catalog/items/" + ctx.item.id)).status, 200);
    const removal = new PluginRemovalService(
      ctx.handle.runtime,
      ctx.handle.runtime.activity,
      new PluginMigrationRunner(ctx.adapter, {
        instanceId: "conformance-removal",
        packageRoot: process.cwd()
      }),
      ctx.adapter,
      {
        async authorizeOperator(actor) {
          assert.equal(actor, "conformance-operator");
        },
        async drainInstances(id) {
          await ctx.handle.runtime.disable(id, "Conformance remove");
        },
        async revokeCredentialsAndGrants() {},
        async detachArtifact() {},
        async planPurge() {
          throw new Error("Purge is outside the conformance scenario");
        },
        async purgeOwnedResources() {
          throw new Error("Purge is outside the conformance scenario");
        }
      }
    );
    await removal.uninstall("catalog-consumer", "conformance-operator");
    await removal.uninstall("catalog-plugin", "conformance-operator");
    assert.ok(
      await ctx.adapter
        .repository("items", { pluginId: "catalog-plugin" })
        .findOne({ filter: { id: ctx.item.id } })
    );
    assert.ok(
      await ctx.adapter
        .repository("observations", { pluginId: "catalog-consumer" })
        .findOne({ filter: { itemId: ctx.item.id } })
    );
    assert.equal(
      ctx.handle.getHttpRouteInventory().some((route) => route.path.startsWith("/v1/catalog/")),
      false
    );
  },
  async "sdk-overlay"() {
    const ctx = await fixture();
    await ctx.handle.runtime.register(definition(ctx, "catalog"));
    await ctx.handle.runtime.register(definition(ctx, "consumer"));
    await new PluginMigrationRunner(ctx.adapter, {
      instanceId: "conformance-reinstall",
      packageRoot: process.cwd()
    }).maintenance.set(
      [{ pluginId: "catalog-plugin" }, { pluginId: "catalog-consumer" }],
      false,
      "conformance-operator"
    );
    await ctx.handle.runtime.load("catalog-plugin");
    await ctx.handle.runtime.load("catalog-consumer");
    const { verifyCatalogOverlay } = await import("./catalog-overlay-dist/catalog-overlay.js");
    await verifyCatalogOverlay(ctx.base, ctx.token);
  }
};
export async function teardown() {
  try {
    await browser?.close();
    await context?.handle?.shutdown();
  } finally {
    if (restoreConnection) {
      assert.match(restoreConnection.name, /^trinacria_catalog_[a-f0-9]+_restore$/);
      await restoreConnection.dropDatabase();
      await restoreConnection.close();
    }
    await context?.connection.close();
    await writeFile("catalog-measurements.json", JSON.stringify(measurements, null, 2));
  }
}
