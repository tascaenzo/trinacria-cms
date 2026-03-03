import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationContext, ModuleDefinition } from "@trinacria/core";
import {
  PluginCompatibilityError,
  PluginDependencyError,
  PluginLifecycleError,
  PluginRuntimeError,
  PluginStateTransitionError,
} from "../src/errors/index.js";
import { InMemoryPluginRuntime } from "../src/runtime/index.js";

test("register and load plugin in runtime registry", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0",
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
        requiresCore: "^1.0.0",
      }),
    PluginCompatibilityError,
  );
});

test("unload from non-loaded state fails with transition error", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0",
  });

  await assert.rejects(
    async () => runtime.unload("cms/plugin-users"),
    PluginStateTransitionError,
  );
});

test("load fails when required dependency is missing and marks plugin as failed", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    dependencies: [{ pluginId: "cms/plugin-users", versionRange: "^1.0.0" }],
  });

  await assert.rejects(
    async () => runtime.load("cms/plugin-content"),
    PluginDependencyError,
  );

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
    dependencies: [{ pluginId: "cms/plugin-b", versionRange: "^1.0.0" }],
  });

  await assert.rejects(
    async () =>
      runtime.register({
        id: "cms/plugin-b",
        version: "1.0.0",
        requiresCore: "^0.1.0",
        dependencies: [{ pluginId: "cms/plugin-a", versionRange: "^1.0.0" }],
      }),
    PluginDependencyError,
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
      requiresCore: "^0.1.0",
    },
    modules: [module],
    async onInit() {
      throw new Error("init exploded");
    },
  });

  await assert.rejects(
    async () => runtime.load("cms/plugin-content"),
    PluginLifecycleError,
  );

  const failedRecord = runtime
    .list()
    .find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(failedRecord?.state, "failed");

  await runtime.register({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.1",
      requiresCore: "^0.1.0",
    },
    modules: [module],
    async onInit() {
      // now ok
    },
  });
  await runtime.load("cms/plugin-content");

  await runtime.disable("cms/plugin-content", "manual stop");
  const disabledRecord = runtime
    .list()
    .find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(disabledRecord?.state, "disabled");
  assert.equal(disabledRecord?.disabledReason, "manual stop");

  await assert.rejects(
    async () => runtime.load("cms/plugin-content"),
    PluginRuntimeError,
  );
});

test("module bridge rolls back registered modules when init fails", async () => {
  const app = createFakeApp();
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });

  await runtime.register({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0",
    },
    modules: [createModule("M1"), createModule("M2")],
    async onInit() {
      throw new Error("boom");
    },
  });

  await assert.rejects(
    async () => runtime.load("cms/plugin-content"),
    PluginLifecycleError,
  );

  assert.deepEqual(app.listModules(), []);
  assert.deepEqual(app.registeredCalls, ["M1", "M2"]);
  assert.deepEqual(app.unregisteredCalls, ["M2", "M1"]);
});

test("cannot unload a plugin with loaded required dependents", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0",
  });
  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    dependencies: [{ pluginId: "cms/plugin-users", versionRange: "^1.0.0" }],
  });

  await runtime.load("cms/plugin-users");
  await runtime.load("cms/plugin-content");

  await assert.rejects(
    async () => runtime.unload("cms/plugin-users"),
    PluginDependencyError,
  );
});

test("loadMany loads plugins in dependency order", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0",
  });
  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    dependencies: [{ pluginId: "cms/plugin-users", versionRange: "^1.0.0" }],
  });

  await runtime.loadMany(["cms/plugin-content", "cms/plugin-users"]);

  const users = runtime.list().find((item) => item.manifest.id === "cms/plugin-users");
  const content = runtime
    .list()
    .find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(users?.state, "loaded");
  assert.equal(content?.state, "loaded");
  assert.ok(users?.loadedAt);
  assert.ok(content?.loadedAt);
  assert.ok(users.loadedAt!.getTime() <= content.loadedAt!.getTime());
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
        optional: true,
      },
    ],
  });

  const snapshot = runtime.describeDependencies();
  assert.equal(snapshot.edges.length, 1);
  assert.equal(snapshot.edges[0]?.status, "missing");
  assert.equal(snapshot.edges[0]?.optional, true);
  assert.equal(snapshot.warnings.length, 1);
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
    },
  });

  await runtime.register({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0",
    },
    async onInit() {
      initAttempt += 1;
      if (initAttempt === 1) {
        throw new Error("transient init error");
      }
    },
  });

  await runtime.load("cms/plugin-content");
  const record = runtime
    .list()
    .find((item) => item.manifest.id === "cms/plugin-content");

  assert.equal(initAttempt, 2);
  assert.equal(record?.state, "loaded");
  assert.equal(
    events.some((event) => event.action === "load" && event.success === false),
    true,
  );
  assert.equal(
    events.some((event) => event.action === "load" && event.success === true),
    true,
  );
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
        providerKinds: {},
      };
    },
    async shutdown() {
      // no-op for tests
    },
  };
}
