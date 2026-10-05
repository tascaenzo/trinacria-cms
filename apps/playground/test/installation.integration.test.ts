import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import { EntriesService } from "@trinacria-cms/editorial-pack/runtime";
import { inspectInstallationPrerequisites } from "@trinacria-cms/core-pack/runtime";
import { createPlaygroundCmsApp, type PlaygroundCmsApp } from "../src/playground-app.js";

const enabled = process.env.TRINACRIA_RUN_MONGO_INTEGRATION === "1";
test("first run, empty install, restart, database drop and interrupted demo use database state", {
  skip: !enabled,
}, async () => {
  const names = [
    "MONGO_URI",
    "HTTP_HOST",
    "HTTP_PORT",
    "CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID",
    "CMS_SECURE_PAYLOAD_KEYS_JSON",
    "CMS_INSTALLED",
    "PLAYGROUND_CLUSTER_ENABLED",
  ];
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const dbName = `trinacria_install_host_${randomUUID().replaceAll("-", "")}`;
  const uri = `mongodb://trinacria:trinacria@127.0.0.1:27017/${dbName}?authSource=admin`;
  const client = new mongoose.mongo.MongoClient(uri);
  const port = 33000 + Math.floor(Math.random() * 12000);
  const base = `http://127.0.0.1:${port}`;
  let app: PlaygroundCmsApp | undefined;
  const start = async () => {
    app = await createPlaygroundCmsApp();
    return app;
  };
  const stop = async () => {
    await app?.handle.shutdown();
    app = undefined;
  };
  const status = async () => (await (await fetch(`${base}/v1/install/status`)).json()).data;
  const input = {
    email: "admin@host.example.test",
    firstName: "Admin",
    lastName: "Host",
    password: "HostInstallation123!",
    confirmPassword: "HostInstallation123!",
    siteName: "Host test",
  };
  const bootstrap = (dataMode: string, email = input.email) =>
    fetch(`${base}/v1/install/bootstrap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, email, dataMode }),
    });
  const entries = () => client.db().collection("entries__plugin_editorial-pack").find({}).toArray();
  const originalCreate = EntriesService.prototype.createEntry;
  try {
    await client.connect();
    process.env.MONGO_URI = uri;
    process.env.HTTP_HOST = "127.0.0.1";
    process.env.HTTP_PORT = String(port);
    process.env.PLAYGROUND_CLUSTER_ENABLED = "false";
    process.env.CMS_INSTALLED = "true"; // Deliberately wrong: this flag has no operational effect.
    delete process.env.CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID;
    delete process.env.CMS_SECURE_PAYLOAD_KEYS_JSON;
    process.env.MONGO_URI = "invalid://operator:must-not-appear-in-diagnostics";
    assert.equal((await start()).handle.startupMode, "installer");
    const invalid = await status();
    assert.ok(
      invalid.checks.some(
        (check: { id: string; status: string }) =>
          check.id === "database" && check.status === "fail",
      ),
    );
    assert.equal(JSON.stringify(invalid).includes("must-not-appear"), false);
    await stop();
    process.env.MONGO_URI = uri;
    assert.equal((await start()).handle.startupMode, "installer");
    const blocked = await status();
    assert.equal(blocked.installed, false);
    assert.equal(blocked.canInstall, false);
    assert.equal(blocked.restartRequired, true);
    assert.ok(
      blocked.checks.some(
        (check: { id: string; status: string }) =>
          check.id === "runtime-keys" && check.status === "fail",
      ),
    );
    assert.equal((await bootstrap("empty")).status, 503);
    assert.equal((await fetch(`${base}/ready`)).status, 503);
    assert.equal(
      app?.handle.getHttpRouteInventory().some((route) => route.path === "/v1/users"),
      false,
    );
    await stop();
    process.env.CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID = "v1";
    process.env.CMS_SECURE_PAYLOAD_KEYS_JSON = JSON.stringify({
      v1: randomBytes(32).toString("base64"),
    });
    assert.equal(
      (await inspectInstallationPrerequisites(uri)).checks.every(
        (check) => check.status === "pass",
      ),
      true,
    );
    assert.equal(
      await client
        .db()
        .collection("settings__plugin_core-pack")
        .countDocuments({ key: /:installation:probe-/ }),
      0,
    );
    await start();
    assert.equal((await status()).canInstall, true);
    assert.equal((await entries()).length, 0);
    const empty = await bootstrap("empty");
    assert.equal(empty.status, 200);
    const completed = (await empty.json()).data.status;
    assert.equal(completed.checks.length, 8);
    assert.equal(
      completed.checks.every((check: { status: string }) => check.status === "pass"),
      true,
    );
    assert.equal((await entries()).length, 0);
    await stop();
    delete process.env.CMS_INSTALLED;
    assert.equal((await start()).installationMode, false);
    assert.equal((await status()).installed, true);
    assert.equal((await entries()).length, 0);
    assert.equal((await bootstrap("empty")).status, 409);
    await stop();
    // Existing installation remains visible when a configured key is missing.
    const keys = process.env.CMS_SECURE_PAYLOAD_KEYS_JSON;
    delete process.env.CMS_SECURE_PAYLOAD_KEYS_JSON;
    await start();
    assert.equal((await status()).installed, true);
    assert.equal((await status()).restartRequired, true);
    await stop();
    process.env.CMS_SECURE_PAYLOAD_KEYS_JSON = keys;
    await client.db().dropDatabase();
    assert.equal((await start()).installationMode, true);
    assert.equal((await status()).installed, false);
    let interruptPage = true;
    EntriesService.prototype.createEntry = async function (...args) {
      if (interruptPage && args[0].slug === "chi-siamo") throw new Error("Interrupted demo page");
      return originalCreate.apply(this, args);
    };
    const interrupted = await bootstrap("demo");
    assert.equal(interrupted.status, 500);
    assert.equal((await status()).installed, false);
    assert.equal((await status()).phase, "content");
    assert.equal((await entries()).length, 1);
    assert.equal((await bootstrap("demo", "takeover@host.example.test")).status, 409);
    interruptPage = false;
    const demo = await bootstrap("demo");
    assert.equal(demo.status, 200);
    const admin = (await demo.json()).data.adminUser;
    const seeded = await entries();
    assert.equal(seeded.length, 2);
    assert.ok(seeded.every((entry) => entry.ownerUserId === admin.id && entry.status === "draft"));
    await stop();
    await start();
    assert.equal((await entries()).length, 2);
    assert.equal((await status()).installed, true);
    assert.equal(
      await client
        .db()
        .collection("settings__plugin_core-pack")
        .countDocuments({ key: /:installation:probe-/ }),
      0,
    );
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    EntriesService.prototype.createEntry = originalCreate;
    await stop();
    await mongoose.disconnect();
    await client.db().dropDatabase();
    await client.close();
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
