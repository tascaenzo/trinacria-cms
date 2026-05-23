import assert from "node:assert/strict";
import test from "node:test";
import type { PluginRuntimeRecord, PluginState } from "../src/contracts/plugin-runtime.js";
import {
  describeAvailableOperations,
  InMemoryPluginRuntime,
  KernelSystemService
} from "../src/runtime/index.js";

test("KernelSystemService exposes operational plugin snapshots", () => {
  const service = new KernelSystemService({
    list: () =>
      [
        {
          manifest: {
            id: "cms/plugin-content",
            version: "1.2.0",
            requiresCore: "^0.1.0",
            capabilities: ["content.read"],
            dependencies: [
              {
                pluginId: "cms/plugin-users",
                versionRange: "^1.0.0"
              }
            ]
          },
          state: "failed",
          failureCount: 2,
          failedAt: new Date("2026-04-06T08:00:00.000Z"),
          lastFailurePhase: "init",
          lastError: Object.assign(new Error("init exploded"), {
            name: "PluginLifecycleError"
          }),
          statusReason: {
            code: "plugin_failed",
            message: "Plugin entered failed state during lifecycle execution"
          }
        } satisfies PluginRuntimeRecord,
        {
          manifest: {
            id: "cms/plugin-users",
            version: "1.0.1",
            requiresCore: "^0.1.0"
          },
          state: "disabled",
          disabledAt: new Date("2026-04-06T09:00:00.000Z"),
          disabledReason: "manual stop",
          statusReason: {
            code: "plugin_disabled",
            message: "Plugin is disabled and cannot be loaded"
          }
        } satisfies PluginRuntimeRecord
      ] as const,
    describeDependencies: () => ({
      nodes: [
        {
          pluginId: "cms/plugin-content",
          state: "failed",
          version: "1.2.0"
        },
        {
          pluginId: "cms/plugin-users",
          state: "disabled",
          version: "1.0.1"
        }
      ],
      edges: [
        {
          from: "cms/plugin-content",
          to: "cms/plugin-users",
          optional: false,
          requiredRange: "^1.0.0",
          status: "disabled",
          currentVersion: "1.0.1"
        }
      ],
      warnings: []
    }),
    describeContributions: () => ({
      entities: [],
      settings: [],
      events: {
        emits: [],
        subscribes: []
      },
      admin: {
        navigation: [],
        routes: [],
        resources: [],
        widgets: [],
        settingsSections: []
      }
    })
  });

  const [content, users] = service.listInstalledPlugins();

  assert.equal(content?.dependencies[0]?.status, "disabled");
  assert.equal(content?.dependencies[0]?.state, "disabled");
  assert.equal(content?.operations.find((item) => item.operation === "load")?.available, false);
  assert.equal(
    content?.operations.find((item) => item.operation === "load")?.reason,
    'Dependency "cms/plugin-users" is disabled'
  );
  assert.equal(content?.operations.find((item) => item.operation === "enable")?.available, false);
  assert.equal(content?.failureCount, 2);
  assert.equal(content?.lastFailurePhase, "init");
  assert.equal(content?.statusReason?.code, "plugin_failed");
  assert.equal(users?.operations.find((item) => item.operation === "enable")?.available, true);
  assert.equal(
    users?.operations.find((item) => item.operation === "load")?.reason,
    "Disabled plugins must be enabled before load"
  );
});

test("KernelSystemService exposes plugin contribution catalog", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }],
    admin: {
      routes: [{ id: "posts", path: "/blog/posts", label: "Posts" }]
    }
  });
  await runtime.load("blog-pack");

  const service = new KernelSystemService(runtime);
  const catalog = service.listPluginContributions();

  assert.equal(catalog.entities[0]?.key, "blog-pack:posts");
  assert.equal(catalog.admin.routes[0]?.declaration.path, "/blog/posts");
});

test("KernelSystemService exposes configured plugin discovery sources", () => {
  const service = new KernelSystemService(createEmptyRuntime(), {
    pluginSources: () => [
      {
        type: "package",
        name: "blog-pack",
        entrypoint: "@acme/blog-pack",
        status: "discovered",
        pluginId: "blog-pack"
      },
      {
        type: "local-path",
        name: "broken-pack",
        entrypoint: "./plugins/broken-pack/index.mjs",
        status: "failed",
        error: "module not found"
      }
    ]
  });

  const sources = service.listPluginSources();

  assert.equal(sources.length, 2);
  assert.equal(sources[0]?.status, "discovered");
  assert.equal(sources[1]?.status, "failed");
  assert.equal(sources[1]?.error, "module not found");
});

test("KernelSystemService executes supported plugin operations", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });

  const service = new KernelSystemService(runtime);

  const loaded = await service.executeOperation("cms/plugin-content", {
    operation: "load"
  });
  assert.equal(loaded.plugin.state, "loaded");

  const disabled = await service.executeOperation("cms/plugin-content", {
    operation: "disable",
    reason: "operator stop"
  });
  assert.equal(disabled.plugin.state, "disabled");
  assert.equal(disabled.plugin.disabledReason, "operator stop");

  const enabled = await service.executeOperation("cms/plugin-content", {
    operation: "enable"
  });
  assert.equal(enabled.plugin.state, "registered");
});

test("KernelSystemService blocks unload and disable when loaded dependents exist", async () => {
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
  await runtime.loadMany(["cms/plugin-content"]);

  const service = new KernelSystemService(runtime);
  const users = service.getInstalledPlugin("cms/plugin-users");

  assert.equal(users?.operations.find((item) => item.operation === "unload")?.available, false);
  assert.equal(users?.operations.find((item) => item.operation === "disable")?.available, false);
  assert.equal(
    users?.operations.find((item) => item.operation === "unload")?.reason,
    "Plugin has loaded required dependents: cms/plugin-content"
  );
});

function createEmptyRuntime(): ConstructorParameters<typeof KernelSystemService>[0] {
  return {
    list: () => [],
    describeDependencies: () => ({
      nodes: [],
      edges: [],
      warnings: []
    }),
    describeContributions: () => ({
      entities: [],
      settings: [],
      events: {
        emits: [],
        subscribes: []
      },
      admin: {
        navigation: [],
        routes: [],
        resources: [],
        widgets: [],
        settingsSections: []
      }
    }),
    load: async () => {},
    unload: async () => {},
    reload: async () => {},
    disable: async () => {},
    enable: async () => {},
    events: () => []
  };
}

test("KernelSystemService exposes recent plugin lifecycle events", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
  await runtime.register({
    id: "cms/plugin-content",
    version: "1.0.0",
    requiresCore: "^0.1.0"
  });
  await runtime.load("cms/plugin-content");

  const service = new KernelSystemService(runtime);
  const events = service.listPluginEvents("cms/plugin-content", 2);

  assert.equal(events.length, 2);
  assert.equal(events[0]?.action, "register");
  assert.equal(events[1]?.action, "load");
  assert.equal(typeof events[0]?.timestamp, "string");
});

test("describeAvailableOperations follows runtime state transitions", () => {
  const expectations: Record<
    PluginState,
    Partial<Record<"load" | "unload" | "reload" | "disable" | "enable", boolean>>
  > = {
    registered: {
      load: true,
      unload: false,
      reload: true,
      disable: true,
      enable: false
    },
    loading: {
      load: false,
      unload: false,
      reload: false,
      disable: false,
      enable: false
    },
    initializing: {
      load: false,
      unload: false,
      reload: false,
      disable: false,
      enable: false
    },
    loaded: {
      load: false,
      unload: true,
      reload: true,
      disable: true,
      enable: false
    },
    unloading: {
      load: false,
      unload: false,
      reload: false,
      disable: true,
      enable: false
    },
    failed: {
      load: true,
      unload: true,
      reload: true,
      disable: true,
      enable: false
    },
    disabled: {
      load: false,
      unload: false,
      reload: false,
      disable: false,
      enable: true
    },
    unloaded: {
      load: true,
      unload: false,
      reload: true,
      disable: true,
      enable: false
    }
  };

  for (const [state, expected] of Object.entries(expectations) as Array<
    [PluginState, (typeof expectations)[PluginState]]
  >) {
    const operations = describeAvailableOperations(createRuntimeRecord(state));
    for (const [operation, available] of Object.entries(expected)) {
      assert.equal(
        operations.find((item) => item.operation === operation)?.available,
        available,
        `${operation} availability for ${state}`
      );
    }
  }
});

function createRuntimeRecord(state: PluginState): PluginRuntimeRecord {
  return {
    manifest: {
      id: "cms/plugin-test",
      version: "1.0.0",
      requiresCore: "^0.1.0"
    },
    state
  };
}
