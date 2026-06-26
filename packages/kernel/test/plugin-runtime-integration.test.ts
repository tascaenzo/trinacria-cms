import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryPluginRuntime } from "../src/runtime/plugin-runtime/in-memory-plugin-runtime.js";
import { InMemoryPluginRuntimeStore } from "../src/runtime/persistence/plugin-runtime-store.js";
import type { ApplicationContext, ModuleDefinition } from "@trinacria/core";
import {
  PluginLifecycleError,
  PluginManifestError,
  PluginStateTransitionError
} from "../src/errors/index.js";

test("register then load exposes contributions in describeContributions", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }],
    settings: [{ key: "blog-pack:blog:title", category: "blog", visibility: "admin" }],
    events: { emits: [{ name: "post-created", visibility: "public", version: 1 }] },
    admin: { routes: [{ id: "list", path: "/blog/posts", label: "Posts" }] }
  });

  assert.equal(runtime.describeContributions().entities.length, 0, "no contributions before load");

  await runtime.load("blog-pack");

  const snapshot = runtime.describeContributions();
  assert.equal(snapshot.entities.length, 1);
  assert.equal(snapshot.entities[0]?.key, "blog-pack:posts");
  assert.equal(snapshot.settings.length, 1);
  assert.equal(snapshot.settings[0]?.key, "blog-pack:blog:title");
  assert.equal(snapshot.events.emits.length, 1);
  assert.equal(snapshot.events.emits[0]?.key, "blog-pack:post-created");
  assert.equal(snapshot.admin.routes.length, 1);
  assert.equal(snapshot.admin.routes[0]?.declaration.path, "/blog/posts");
});

test("reconcileDiscoveredPlugins marks missing plugins as failed and removes loaded contributions", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });
  await runtime.load("blog-pack");

  assert.equal(runtime.describeContributions().entities.length, 1);

  await runtime.reconcileDiscoveredPlugins([]);

  const record = runtime.list().find((r) => r.manifest.id === "blog-pack");
  assert.equal(record?.state, "failed");
  assert.equal(runtime.describeContributions().entities.length, 0);
});

test("unregister removes both registration and loaded contributions", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "pack-a",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "items", schemaVersion: 1 }]
  });
  await runtime.load("pack-a");
  await runtime.unload("pack-a");
  await runtime.unregister("pack-a");

  await runtime.register({
    id: "pack-b",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "items", schemaVersion: 1 }]
  });
  await runtime.load("pack-b");

  assert.equal(runtime.describeContributions().entities.length, 1);
  assert.equal(runtime.describeContributions().entities[0]?.key, "pack-b:items");
});

test("disable removes loaded but preserves registration contributions", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });

  await runtime.register({
    id: "other-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "comments", schemaVersion: 1 }]
  });

  await runtime.load("blog-pack");
  await runtime.load("other-pack");
  assert.equal(runtime.describeContributions().entities.length, 2);

  await runtime.disable("blog-pack", "maintenance");
  assert.equal(runtime.describeContributions().entities.length, 1);
  assert.equal(runtime.describeContributions().entities[0]?.key, "other-pack:comments");
});

test("load failure rolls back contributions and persists failed state", async () => {
  const store = new InMemoryPluginRuntimeStore();
  const app = createFakeApp();
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app, runtimeStore: store });

  await runtime.register({
    manifest: {
      id: "blog-pack",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      entities: [{ name: "posts", schemaVersion: 1 }]
    },
    async onInit() {
      throw new Error("init failed");
    }
  });

  await assert.rejects(async () => runtime.load("blog-pack"), PluginLifecycleError);

  assert.equal(runtime.describeContributions().entities.length, 0);

  const allStored = await store.list();
  const stored = allStored.find((r) => r.pluginId === "blog-pack");
  assert.equal(stored?.state, "failed");
  assert.equal(stored?.lastFailurePhase, "init");
});

test("full lifecycle: register -> load -> unload -> register update -> reload", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });

  await runtime.load("blog-pack");
  assert.equal(runtime.describeContributions().entities.length, 1);

  await runtime.unload("blog-pack");
  assert.equal(runtime.describeContributions().entities.length, 0);

  await runtime.register({
    id: "blog-pack",
    version: "1.0.1",
    requiresCore: "^0.1.0",
    entities: [
      { name: "posts", schemaVersion: 1 },
      { name: "tags", schemaVersion: 1 }
    ]
  });

  await runtime.load("blog-pack");
  assert.equal(runtime.describeContributions().entities.length, 2);
  assert.equal(runtime.describeContributions().entities[1]?.key, "blog-pack:tags");
});

test("registration collides with existing loaded contribution", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "pack-a",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    admin: { routes: [{ id: "dashboard", path: "/dashboard", label: "Dashboard" }] }
  });
  await runtime.load("pack-a");

  await assert.rejects(
    async () =>
      runtime.register({
        id: "pack-b",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        admin: { routes: [{ id: "dup", path: "/dashboard", label: "Dup" }] }
      }),
    PluginManifestError
  );
});

test("persistence survives runtime store round-trip", async () => {
  const store = new InMemoryPluginRuntimeStore();
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", runtimeStore: store });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });
  await runtime.load("blog-pack");

  const allStored = await store.list();
  const stored = allStored.find((r) => r.pluginId === "blog-pack");
  assert.equal(stored?.state, "loaded");
  assert.ok(stored?.loadedAt);
});

test("events track lifecycle across persistence boundaries", async () => {
  const events: Array<{ action: string; success: boolean }> = [];
  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    onEvent(event) {
      events.push({ action: event.action, success: event.success });
    }
  });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });
  await runtime.load("blog-pack");
  await runtime.unload("blog-pack");
  await runtime.unregister("blog-pack");

  assert.equal(events.length, 4);
  assert.deepEqual(
    events.map((e) => e.action),
    ["register", "load", "unload", "unregister"]
  );
  assert.ok(events.every((e) => e.success));
});

function createFakeApp(): ApplicationContext & {
  registeredCalls: string[];
  unregisteredCalls: string[];
} {
  const modules = new Map<string, ModuleDefinition>();
  const registeredCalls: string[] = [];
  const unregisteredCalls: string[] = [];

  return {
    registeredCalls,
    unregisteredCalls,
    async registerModule(module: ModuleDefinition) {
      registeredCalls.push(module.name);
      modules.set(module.name, module);
    },
    async unregisterModule(module: ModuleDefinition) {
      unregisteredCalls.push(module.name);
      modules.delete(module.name);
    },
    listModules() {
      return Array.from(modules.keys());
    },
    async resolve() {
      throw new Error("not implemented in test");
    },
    registerGlobalProvider() {},
    getProvidersByKind() {
      return [];
    },
    isModuleRegistered(module: ModuleDefinition) {
      return modules.has(module.name);
    },
    hasToken() {
      return false;
    },
    describeGraph() {
      return { modules: [], providerKinds: {} };
    },
    async shutdown() {}
  };
}
