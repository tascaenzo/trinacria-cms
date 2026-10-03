import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createCorePackPlugin } from "@trinacria-cms/core-pack";
import {
  LocalCredentialsRepository,
  PasswordHashingService,
  UsersRepository
} from "@trinacria-cms/core-pack/runtime";
import { createEmailPackPlugin } from "@trinacria-cms/email-pack";
import { createCatalogConsumer } from "@trinacria-cms/example-catalog-consumer";
import { CORE_TOKENS, valueProvider } from "@trinacria-cms/kernel";
import {
  createInMemoryPluginRuntimeStore,
  createMongoDbAdapter,
  EntityRegistry,
  PluginMigrationRunner,
  PluginRemovalService,
  startCmsApp
} from "@trinacria-cms/kernel/runtime";
import { CATALOG_MANIFEST, createCatalogPlugin } from "catalog-plugin";
import mongoose from "mongoose";

process.env.CMS_JWT_SECRET = randomBytes(48).toString("hex");
process.env.CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID = "catalog-fixture";
process.env.CMS_SECURE_PAYLOAD_KEYS_JSON = JSON.stringify({
  "catalog-fixture": randomBytes(32).toString("base64")
});
const uri = new URL(process.env.MONGO_URI);
uri.pathname = `/trinacria_catalog_${randomUUID().replaceAll("-", "")}_e2e`;
const connection = await mongoose.createConnection(uri.toString()).asPromise();
const preserveForUpgrade = Boolean(process.send);
if (preserveForUpgrade)
  await writeFile("catalog-state.json", JSON.stringify({ databaseName: connection.name }));
const registry = new EntityRegistry(),
  db = createMongoDbAdapter({ connection, entityRegistry: registry });
const consumer = createCatalogConsumer(),
  original = consumer.onLoad;
let consumerServices, catalogServices;
const catalogPlugin = createCatalogPlugin(),
  catalogLoad = catalogPlugin.onLoad;
catalogPlugin.onLoad = async (context) => {
  await catalogLoad(context);
  catalogServices = context.services;
};
consumer.onLoad = async (context) => {
  await original(context);
  consumerServices = context.services;
};
let handle;
const base = `http://127.0.0.1:${process.env.CATALOG_PORT}`;
async function request(method, path, data, token) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) })
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
  throw new Error("Catalog delivery did not reach its actual inbox/owned effect");
}
try {
  handle = await startCmsApp({
    coreVersion: "0.1.0",
    globalProviders: [
      valueProvider(CORE_TOKENS.DB_ADAPTER, db),
      valueProvider(CORE_TOKENS.ENTITY_REGISTRY, registry)
    ],
    plugins: [createCorePackPlugin(), createEmailPackPlugin(), catalogPlugin, consumer],
    pluginRuntimeStore: createInMemoryPluginRuntimeStore(),
    autoLoadPlugins: false,
    durableEvents: { pollMs: 30 },
    http: {
      host: "127.0.0.1",
      port: Number(process.env.CATALOG_PORT),
      openApi: { enabled: true, title: "External catalog", version: "1" }
    }
  });
  await handle.runtime.load("core-pack");
  await handle.runtime.load("email-pack");
  await handle.runtime.load("catalog-plugin");
  await handle.runtime.load("catalog-consumer");
  const password = randomBytes(20).toString("base64") + "aA1!",
    email = "admin@catalog.example.test";
  const bootstrap = await request("POST", "/v1/install/bootstrap", {
    siteName: "External catalog",
    firstName: "Catalog",
    lastName: "Operator",
    email,
    password,
    confirmPassword: password
  });
  assert.equal(bootstrap.status, 200, JSON.stringify(bootstrap.body));
  const login = await request("POST", "/v1/auth/login", { email, password });
  assert.equal(login.status, 200);
  const token = login.body.data.accessToken;
  const prefixKey = "catalog-plugin:catalog:prefix";
  assert.equal(await catalogServices.settings.get(prefixKey), "");
  await assert.rejects(catalogServices.settings.get("core-pack:auth:mfa_mode"));
  await assert.rejects(catalogServices.settings.set("catalog-plugin:catalog:unknown", "foreign"));
  await catalogServices.settings.set(prefixKey, "Prefix: ");
  assert.equal((await request("GET", "/v1/catalog/items")).status, 401);
  const viewer = await new UsersRepository(db).create({
    email: "viewer@catalog.example.test",
    firstName: "Catalog",
    lastName: "Viewer"
  });
  await new LocalCredentialsRepository(db).upsert({
    userId: viewer.id,
    ...(await new PasswordHashingService().hashPassword(password))
  });
  const viewerLogin = await request("POST", "/v1/auth/login", { email: viewer.email, password });
  assert.equal(viewerLogin.status, 200);
  assert.equal(
    (
      await request(
        "POST",
        "/v1/catalog/items",
        { name: "Forbidden", priceCents: 1 },
        viewerLogin.body.data.accessToken
      )
    ).status,
    403
  );
  assert.equal(
    (await request("POST", "/v1/catalog/items", { name: "Item", priceCents: -1 }, token)).status,
    400
  );
  const created = await request(
    "POST",
    "/v1/catalog/items",
    { name: "External item", priceCents: 1200 },
    token
  );
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const item = created.body.data;
  assert.equal(item.priceCents, 1200);
  assert.equal(item.version, 1);
  assert.equal(item.name, "Prefix: External item");
  await catalogServices.settings.set(prefixKey, "");
  const observation = await waitFor(() =>
    db
      .repository("observations", { pluginId: "catalog-consumer" })
      .findOne({ filter: { itemId: item.id } })
  );
  const delivery = await waitFor(() =>
    db
      .repository("event_deliveries", { pluginId: "kernel" })
      .findOne({ filter: { consumerPluginId: "catalog-consumer", status: "succeeded" } })
  );
  assert.equal(observation.id, delivery.eventId);
  const operational = await request(
    "GET",
    "/v1/system/deliveries/" + encodeURIComponent(delivery.id),
    undefined,
    token
  );
  assert.equal(operational.status, 200);
  assert.equal(operational.body.data.status, "succeeded");
  assert.equal("payload" in operational.body.data, false);
  assert.equal(
    (
      await request(
        "POST",
        "/v1/system/deliveries/" + encodeURIComponent(delivery.id) + "/retry",
        { expectedEpoch: delivery.epoch, reason: "Do not repeat succeeded effect" },
        token
      )
    ).status,
    409
  );
  assert.equal(
    (await request("GET", "/v1/system/deliveries", undefined, viewerLogin.body.data.accessToken))
      .status,
    403
  );
  assert.equal((await request("GET", "/v1/system/email-jobs", undefined, token)).status, 200);
  assert.equal(
    (await request("GET", "/v1/system/email-jobs", undefined, viewerLogin.body.data.accessToken))
      .status,
    403
  );
  // Installed trusted integrations need no database approvals.
  assert.equal(
    (await consumerServices.operations.call("catalog-consumer", "inspect", { id: item.id })).id,
    item.id
  );
  assert.equal(
    (await request("GET", "/v1/security/plugin-grants", undefined, token)).body.data.length,
    0
  );
  const updated = await request(
    "PATCH",
    `/v1/catalog/items/${item.id}`,
    { expectedVersion: 1, input: { name: "Updated item", priceCents: 1300 } },
    token
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.version, 2);
  assert.equal(
    (
      await request(
        "PATCH",
        `/v1/catalog/items/${item.id}`,
        { expectedVersion: 1, input: { name: "Stale", priceCents: 1 } },
        token
      )
    ).status,
    409
  );
  await assert.rejects(handle.runtime.reload("catalog-plugin"), /loaded dependents/);
  await handle.runtime.unload("catalog-consumer");
  const staleCatalogServices = catalogServices;
  await handle.runtime.reload("catalog-plugin");
  await assert.rejects(staleCatalogServices.settings.get(prefixKey));
  await handle.runtime.load("catalog-consumer");
  assert.equal(
    (await request("GET", `/v1/catalog/items/${item.id}`, undefined, token)).body.data.name,
    "Updated item"
  );
  const document = await (await fetch(base + "/openapi.json")).json();
  const catalog = Object.values(document.paths)
    .flatMap((methods) => Object.values(methods))
    .filter((operation) => operation["x-cms-plugin-id"] === CATALOG_MANIFEST.id);
  assert.equal(catalog.length, 5);
  assert.equal(new Set(catalog.map((operation) => operation.operationId)).size, 5);
  await writeFile("catalog-openapi.json", JSON.stringify(document));
  await writeFile("catalog-manifest.json", JSON.stringify(CATALOG_MANIFEST));
  if (process.send) {
    await writeFile(
      "catalog-state.json",
      JSON.stringify({ databaseName: connection.name, itemId: item.id })
    );
    process.send({ type: "catalog-ready", token, password, itemId: item.id });
    await new Promise((resolve, reject) => {
      const deadline = setTimeout(
        () => reject(new Error("External catalog browser deadline")),
        120000
      );
      process.once("message", (message) => {
        clearTimeout(deadline);
        message?.type === "catalog-continue"
          ? resolve()
          : reject(new Error("Unexpected fixture command"));
      });
    });
    const { verifyCatalogOverlay } = await import("./catalog-overlay-dist/catalog-overlay.js");
    await verifyCatalogOverlay(base, token);
  }
  const runner = new PluginMigrationRunner(db, {
    instanceId: "external-catalog-removal",
    packageRoot: process.cwd()
  });
  const removal = new PluginRemovalService(handle.runtime, handle.runtime.activity, runner, db, {
    async authorizeOperator(actor) {
      assert.equal(actor, "fixture-operator");
    },
    async drainInstances(id) {
      await handle.runtime.disable(id, "External removal");
    },
    async revokeCredentialsAndGrants() {
      // This fixture has no external caller credentials or experimental grants.
    },
    async detachArtifact() {},
    async planPurge() {
      throw new Error("No purge authorized");
    },
    async purgeOwnedResources() {
      throw new Error("No purge authorized");
    }
  });
  await removal.uninstall("catalog-consumer", "fixture-operator");
  await removal.uninstall("catalog-plugin", "fixture-operator");
  assert.equal(
    (
      await db
        .repository("items", { pluginId: "catalog-plugin" })
        .findOne({ filter: { id: item.id } })
    ).priceCents,
    1300
  );
  assert.equal(
    (
      await db
        .repository("observations", { pluginId: "catalog-consumer" })
        .findOne({ filter: { id: observation.id } })
    ).id,
    observation.id
  );
  assert.equal(
    handle.getHttpRouteInventory().some((route) => route.path.startsWith("/v1/catalog/")),
    false
  );
  await assert.rejects(
    consumerServices.operations.call("catalog-consumer", "inspect", { id: item.id })
  );
  console.log(
    "EXTERNAL_CATALOG_PASSED: real tarballs, CRUD, authenticated denial, atomic protected event without approvals, reload and uninstall preserve data"
  );
} finally {
  await handle?.shutdown();
  assert.match(
    connection.name,
    /^trinacria_catalog_[a-f0-9]+_e2e$/,
    "Refusing non-fixture database cleanup"
  );
  if (!preserveForUpgrade) await connection.dropDatabase();
  await connection.close();
}
