import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createCorePackPlugin } from "@trinacria-cms/core-pack";
import { createCorePackMongoGlobalProviders } from "@trinacria-cms/core-pack/runtime";
import { createEditorialPackPlugin } from "@trinacria-cms/editorial-pack";
import { createEmailPackPlugin } from "@trinacria-cms/email-pack";
import { createInMemoryPluginRuntimeStore, startCmsApp } from "@trinacria-cms/kernel/runtime";
import { createMediaPackPlugin } from "@trinacria-cms/media-pack";
import { createCmsSdkClient } from "@trinacria-cms/sdk";
import mongoose from "mongoose";

process.env.CMS_JWT_SECRET = randomBytes(48).toString("hex");
process.env.CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID = "external-fixture";
process.env.CMS_SECURE_PAYLOAD_KEYS_JSON = JSON.stringify({
  "external-fixture": randomBytes(32).toString("base64")
});
const plugins = [
  createCorePackPlugin(),
  createEmailPackPlugin(),
  createMediaPackPlugin(),
  createEditorialPackPlugin()
];
const handle = await startCmsApp({
  coreVersion: plugins[0].manifest.version,
  http: {
    host: "127.0.0.1",
    port: Number(process.env.FIXTURE_PORT),
    openApi: { enabled: true, title: "External host", version: "1" }
  },
  globalProviders: createCorePackMongoGlobalProviders({ uri: process.env.MONGO_URI }),
  plugins,
  autoLoadPlugins: true,
  enablePluginManifestProvisioning: false,
  pluginRuntimeStore: createInMemoryPluginRuntimeStore()
});
try {
  assert.deepEqual(
    handle.runtime.list().map((plugin) => plugin.state),
    ["loaded", "loaded", "loaded", "loaded"]
  );
  const cms = createCmsSdkClient({ baseUrl: `http://127.0.0.1:${process.env.FIXTURE_PORT}` });
  const status = await cms.installation.getInstallationStatus();
  assert.equal(status.data.dbConfigured, true);
  const document = await (
    await fetch(`http://127.0.0.1:${process.env.FIXTURE_PORT}/openapi.json`)
  ).json();
  const editorial = Object.entries(document.paths)
    .filter(([path]) => path.startsWith("/v1/editorial/"))
    .flatMap(([, methods]) => Object.values(methods));
  assert.equal(editorial.length, 25);
  const ids = editorial.map((operation) => operation.operationId).sort();
  assert.equal(new Set(ids).size, 25);
  const previewIds = ["createEditorialPreviewToken", "listEditorialPreviewSites"];
  assert.deepEqual(ids, [...Object.keys(cms.editorial), ...previewIds].sort());
  for (const id of previewIds) assert.equal(typeof cms.preview[id], "function");
  const originalIds = [
    "approveEditorialEntry",
    "createEditorialContentType",
    "createEditorialEntry",
    "createEditorialEntryRevision",
    "deleteEditorialContentType",
    "deleteEditorialEntry",
    "getEditorialContentType",
    "getEditorialEntry",
    "listDeletedEditorialContentTypes",
    "listEditorialContentTypes",
    "listEditorialEntries",
    "listEditorialEntryRevisions",
    "permanentlyDeleteEditorialContentType",
    "publishEditorialEntry",
    "requestEditorialEntryChanges",
    "restoreEditorialContentType",
    "restoreEditorialEntryRevision",
    "submitEditorialEntry",
    "transitionEditorialEntry",
    "unpublishEditorialEntry",
    "updateEditorialContentType",
    "updateEditorialEntry"
  ];
  for (const original of originalIds) assert.ok(ids.includes(original));
  for (const added of [
    "publishEditorialEntrySnapshot",
    "createEditorialPreviewToken",
    "listEditorialPreviewSites"
  ])
    assert.ok(ids.includes(added));
  console.log("EXTERNAL_BACKEND_READY");
  await new Promise((resolve) => process.once("SIGTERM", resolve));
} finally {
  await handle.shutdown();
  await cleanupTestDatabase();
}

async function cleanupTestDatabase() {
  const cleanup = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  try {
    if (!/^trinacria_external_host_[a-f0-9]+_e2e$/.test(cleanup.name))
      throw new Error("Refusing to drop non-fixture database");
    await cleanup.dropDatabase();
  } finally {
    await cleanup.close();
  }
}
