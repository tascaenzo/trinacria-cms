import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationContext, ModuleDefinition } from "@trinacria/core";
import {
  PluginCompatibilityError,
  PluginDependencyError,
  PluginLifecycleError,
  PluginManifestError,
  PluginRuntimeError,
  PluginStateTransitionError
} from "../src/errors/index.js";
import { InMemoryPluginRuntime } from "../src/runtime/index.js";

test("register and load plugin in runtime registry", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });

  await runtime.load("cms/plugin-content");

  const [record] = runtime.list();
  assert.ok(record);
  assert.equal(record.manifest.id, "cms/plugin-content");
  assert.equal(record.state, "loaded");
});

test("register throws when plugin is not compatible with core version", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await assert.rejects(
    async () =>
      runtime.register({
        id: "cms/plugin-content",
        version: "1.0.0",
        requiresCore: "^1.0.0"
      }),
    PluginCompatibilityError
  );
});

test("unload from non-loaded state fails with transition error", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });

  await assert.rejects(async () => runtime.unload("cms/plugin-users"), PluginStateTransitionError);
});

test("load fails when required dependency is missing and marks plugin as failed", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    dependencies: [{ pluginId: "cms/plugin-users", versionRange: "^1.0.0" }]
  });

  await assert.rejects(async () => runtime.load("cms/plugin-content"), PluginDependencyError);

  const [record] = runtime.list();
  assert.equal(record?.state, "failed");
  assert.equal(record?.lastFailurePhase, "dependency-check");
});

test("register fails on circular dependency graph", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-a",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    dependencies: [{ pluginId: "cms/plugin-b", versionRange: "^1.0.0" }]
  });

  await assert.rejects(
    async () =>
      runtime.register({
        id: "cms/plugin-b",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        dependencies: [{ pluginId: "cms/plugin-a", versionRange: "^1.0.0" }]
      }),
    PluginDependencyError
  );
});

test("failed state is temporary, disabled state is persistent", async () => {
  const app = createFakeApp();
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });

  const module = createModule("ContentModule");
  await runtime.register({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0"
    },
    modules: [module],
    async onInit() {
      throw new Error("init exploded");
    }
  });

  await assert.rejects(async () => runtime.load("cms/plugin-content"), PluginLifecycleError);

  const failedRecord = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(failedRecord?.state, "failed");

  await runtime.register({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.1",
      requiresCore: "^0.1.0"
    },
    modules: [module],
    async onInit() {
      // now ok
    }
  });
  await runtime.load("cms/plugin-content");

  await runtime.disable("cms/plugin-content", "manual stop");
  const disabledRecord = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(disabledRecord?.state, "disabled");
  assert.equal(disabledRecord?.disabledReason, "manual stop");

  await assert.rejects(async () => runtime.load("cms/plugin-content"), PluginRuntimeError);

  await runtime.enable("cms/plugin-content");
  const reenabledRecord = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(reenabledRecord?.state, "registered");
  assert.equal(reenabledRecord?.disabledReason, undefined);
});

test("module bridge rolls back registered modules when init fails", async () => {
  const app = createFakeApp();
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });

  await runtime.register({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0"
    },
    modules: [createModule("M1"), createModule("M2")],
    async onInit() {
      throw new Error("boom");
    }
  });

  await assert.rejects(async () => runtime.load("cms/plugin-content"), PluginLifecycleError);

  assert.deepEqual(app.listModules(), []);
  assert.deepEqual(app.registeredCalls, ["M1", "M2"]);
  assert.deepEqual(app.unregisteredCalls, ["M2", "M1"]);
});

test("unload can clear failed plugin state after unload failure", async () => {
  const app = createFakeApp();
  let unloadAttempts = 0;
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });

  await runtime.register({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0"
    },
    modules: [createModule("M1")],
    async onUnload() {
      unloadAttempts += 1;
      if (unloadAttempts === 1) {
        throw new Error("unload exploded");
      }
    }
  });

  await runtime.load("cms/plugin-content");
  await assert.rejects(async () => runtime.unload("cms/plugin-content"), PluginLifecycleError);

  const failedRecord = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(failedRecord?.state, "failed");
  assert.deepEqual(app.listModules(), ["M1"]);

  await runtime.unload("cms/plugin-content");

  const unloadedRecord = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(unloadedRecord?.state, "unloaded");
  assert.deepEqual(app.listModules(), []);
});

test("cannot unload a plugin with loaded required dependents", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });
  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    dependencies: [{ pluginId: "cms/plugin-users", versionRange: "^1.0.0" }]
  });

  await runtime.load("cms/plugin-users");
  await runtime.load("cms/plugin-content");

  await assert.rejects(async () => runtime.unload("cms/plugin-users"), PluginDependencyError);
});

test("loadMany loads plugins in dependency order", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });
  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    dependencies: [{ pluginId: "cms/plugin-users", versionRange: "^1.0.0" }]
  });

  await runtime.loadMany(["cms/plugin-content", "cms/plugin-users"]);

  const users = runtime.list().find((item) => item.manifest.id === "cms/plugin-users");
  const content = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(users?.state, "loaded");
  assert.equal(content?.state, "loaded");
  assert.ok(users?.loadedAt);
  assert.ok(content?.loadedAt);
  assert.ok(users.loadedAt!.getTime() <= content.loadedAt!.getTime());
});

test("loadMany includes required dependencies even when only target is requested", async () => {
  const app = createFakeApp();
  const calls: string[] = [];
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });

  await runtime.register({
    manifest: {
      id: "cms/plugin-users",
      version: "1.0.0",
      requiresCore: "^0.1.0"
    },
    onLoad() {
      calls.push("users");
    }
  });
  await runtime.register({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      dependencies: [{ pluginId: "cms/plugin-users", versionRange: "^1.0.0" }]
    },
    onLoad() {
      calls.push("content");
    }
  });

  await runtime.loadMany(["cms/plugin-content"]);

  assert.deepEqual(calls, ["users", "content"]);
});

test("loadMany rejects disabled required dependencies before loading targets", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });
  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    dependencies: [{ pluginId: "cms/plugin-users", versionRange: "^1.0.0" }]
  });
  await runtime.disable("cms/plugin-users", "maintenance");

  await assert.rejects(async () => runtime.loadMany(["cms/plugin-content"]), PluginDependencyError);

  const content = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(content?.state, "registered");
});

test("describeDependencies reports optional missing dependency as warning", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    dependencies: [
      {
        pluginId: "cms/plugin-preview",
        versionRange: "^1.0.0",
        optional: true
      }
    ]
  });

  const snapshot = runtime.describeDependencies();
  assert.equal(snapshot.edges.length, 1);
  assert.equal(snapshot.edges[0]?.status, "missing");
  assert.equal(snapshot.edges[0]?.optional, true);
  assert.equal(snapshot.warnings.length, 1);
});

test("describeContributions exposes manifest-derived plugin declarations", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }],
    settings: [
      {
        namespace: "editorial",
        key: "default-status",
        type: "string",
        visibility: "protected"
      }
    ],
    events: {
      emits: [{ name: "post-published", visibility: "public", version: 1 }]
    },
    admin: {
      routes: [{ id: "posts", path: "/blog/posts", label: "Posts" }]
    }
  });

  const snapshot = runtime.describeContributions();
  assert.equal(snapshot.entities[0]?.key, "blog-pack:posts");
  assert.equal(snapshot.settings[0]?.key, "blog-pack:editorial:default-status");
  assert.equal(snapshot.events.emits[0]?.key, "blog-pack:post-published");
  assert.equal(snapshot.admin.routes[0]?.declaration.path, "/blog/posts");
});

test("register rejects global admin path collisions", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    admin: {
      routes: [{ id: "posts", path: "/content/posts", label: "Posts" }]
    }
  });

  await assert.rejects(
    async () =>
      runtime.register({
        id: "commerce-pack",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        admin: {
          routes: [{ id: "orders", path: "/content/posts", label: "Orders" }]
        }
      }),
    PluginManifestError
  );
});

test("register rejects cross-plugin namespace collisions", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });

  await assert.rejects(
    async () =>
      runtime.register({
        id: "commerce-pack",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        entities: [{ name: "posts", schemaVersion: 1 }]
      }),
    PluginManifestError
  );

  assert.equal(
    runtime.list().some((item) => item.manifest.id === "commerce-pack"),
    false
  );
});

test("unregister removes plugin contributions from runtime catalog", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });

  assert.equal(runtime.describeContributions().entities.length, 1);

  await runtime.unregister("blog-pack");

  assert.equal(runtime.describeContributions().entities.length, 0);
});

test("runtime emits lifecycle events and retries failed load when configured", async () => {
  const app = createFakeApp();
  const events: Array<{ action: string; success: boolean }> = [];
  let initAttempt = 0;

  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    app,
    retryPolicy: { maxAttempts: 1, backoffMs: 0 },
    onEvent(event) {
      events.push({ action: event.action, success: event.success });
    }
  });

  await runtime.register({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0"
    },
    async onInit() {
      initAttempt += 1;
      if (initAttempt === 1) {
        throw new Error("transient init error");
      }
    }
  });

  await runtime.load("cms/plugin-content");
  const record = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");

  assert.equal(initAttempt, 2);
  assert.equal(record?.state, "loaded");
  assert.equal(
    events.some((event) => event.action === "load" && event.success === false),
    true
  );
  assert.equal(
    events.some((event) => event.action === "load" && event.success === true),
    true
  );
});

test("runtime keeps a bounded event log for operational diagnostics", async () => {
  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    eventBufferSize: 2
  });

  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });
  await runtime.load("cms/plugin-content");
  await runtime.disable("cms/plugin-content", "operator stop");

  const events = runtime.events();
  assert.equal(events.length, 2);
  assert.deepEqual(
    events.map((event) => event.action),
    ["load", "disable"]
  );
  assert.equal(events[0]?.sequence, 2);
  assert.equal(events[1]?.sequence, 3);
});

test("runtime supports unregister when plugin is not loaded", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-temp",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });

  await runtime.unregister("cms/plugin-temp");
  assert.equal(
    runtime.list().some((item) => item.manifest.id === "cms/plugin-temp"),
    false
  );
});

test("onBeforeUnregister lifecycle hook is executed", async () => {
  const app = createFakeApp();
  const calls: string[] = [];
  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    app,
    lifecycleHooks: {
      onBeforeUnregister(context) {
        calls.push(context.pluginId);
      }
    }
  });

  await runtime.register({
    id: "cms/plugin-temp",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });

  await runtime.unregister("cms/plugin-temp");
  assert.deepEqual(calls, ["cms/plugin-temp"]);
});

test("onAfterLoad lifecycle hook is executed", async () => {
  const app = createFakeApp();
  const calls: string[] = [];
  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    app,
    lifecycleHooks: {
      onAfterLoad(context) {
        calls.push(context.pluginId);
      }
    }
  });

  await runtime.register({
    id: "cms/plugin-temp",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });
  await runtime.load("cms/plugin-temp");

  assert.deepEqual(calls, ["cms/plugin-temp"]);
});

function createModule(name: string): ModuleDefinition {
  return { name };
}

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
    registerGlobalProvider() {
      // no-op for tests
    },
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
      return {
        modules: [],
        providerKinds: {}
      };
    },
    async shutdown() {
      // no-op for tests
    }
  };
}
