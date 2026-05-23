import assert from "node:assert/strict";
import test from "node:test";
import type {
  PluginDiscoveryResult,
  PluginDiscoveryService,
  PluginDiscoverySource
} from "../src/contracts/plugin-discovery.js";
import type { KernelPluginDefinition } from "../src/contracts/plugin-runtime.js";
import {
  bootstrapDiscoveredPlugins,
  InMemoryPluginRuntime,
  InMemoryPluginRuntimeStore
} from "../src/runtime/index.js";

test("bootstrapDiscoveredPlugins registers discovered plugins and autoloads with dependency ordering", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
  const discoveryService = createDiscoveryService({
    plugins: [
      createPlugin("cms/plugin-users"),
      createPlugin("cms/plugin-content", [
        {
          pluginId: "cms/plugin-users",
          versionRange: "^1.0.0"
        }
      ])
    ],
    sources: [
      {
        type: "package",
        name: "content-pack",
        entrypoint: "@acme/content-pack",
        status: "discovered",
        pluginId: "cms/plugin-content"
      }
    ]
  });

  const result = await bootstrapDiscoveredPlugins({
    runtime,
    discoveryService,
    pluginSources: [createSource("content-pack")]
  });

  assert.equal(result.plugins.length, 2);
  assert.equal(result.pluginSources[0]?.status, "discovered");

  const records = runtime.list();
  assert.equal(records.find((item) => item.manifest.id === "cms/plugin-users")?.state, "loaded");
  assert.equal(records.find((item) => item.manifest.id === "cms/plugin-content")?.state, "loaded");

  const loadEvents = runtime.events().filter((event) => event.action === "load");
  assert.deepEqual(
    loadEvents.map((event) => event.pluginId),
    ["cms/plugin-users", "cms/plugin-content"]
  );
});

test("bootstrapDiscoveredPlugins preserves failed source diagnostics and can skip autoload", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
  const discoveryService = createDiscoveryService({
    plugins: [createPlugin("cms/plugin-content")],
    sources: [
      {
        type: "package",
        name: "content-pack",
        entrypoint: "@acme/content-pack",
        status: "discovered",
        pluginId: "cms/plugin-content"
      },
      {
        type: "package",
        name: "broken-pack",
        entrypoint: "@acme/broken-pack",
        status: "failed",
        error: "module not found"
      }
    ]
  });

  const result = await bootstrapDiscoveredPlugins({
    runtime,
    discoveryService,
    pluginSources: [createSource("content-pack"), createSource("broken-pack")],
    autoLoadPlugins: false
  });

  assert.equal(result.pluginSources.length, 2);
  assert.equal(result.pluginSources[1]?.status, "failed");
  assert.equal(result.pluginSources[1]?.error, "module not found");
  assert.equal(runtime.list()[0]?.state, "registered");
  assert.equal(
    runtime.events().some((event) => event.action === "load"),
    false
  );
});

test("bootstrapDiscoveredPlugins preserves disabled persisted state during autoload", async () => {
  const store = new InMemoryPluginRuntimeStore();
  await store.upsert({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0"
    },
    state: "disabled",
    disabledReason: "maintenance",
    disabledAt: new Date("2026-05-23T10:00:00.000Z")
  });

  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    runtimeStore: store
  });

  await bootstrapDiscoveredPlugins({
    runtime,
    discoveryService: createDiscoveryService({
      plugins: [createPlugin("cms/plugin-content")],
      sources: []
    }),
    pluginSources: []
  });

  const record = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(record?.state, "disabled");
  assert.equal(record?.disabledReason, "maintenance");
});

test("bootstrapDiscoveredPlugins autoloads plugins that were previously loaded", async () => {
  const store = new InMemoryPluginRuntimeStore();
  await store.upsert({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0"
    },
    state: "loaded",
    loadedAt: new Date("2026-05-23T10:00:00.000Z")
  });

  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    runtimeStore: store
  });

  await bootstrapDiscoveredPlugins({
    runtime,
    discoveryService: createDiscoveryService({
      plugins: [createPlugin("cms/plugin-content")],
      sources: []
    }),
    pluginSources: []
  });

  const record = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(record?.state, "loaded");
});

test("bootstrapDiscoveredPlugins preserves failed persisted state until explicit operation", async () => {
  const store = new InMemoryPluginRuntimeStore();
  await store.upsert({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0"
    },
    state: "failed",
    failedAt: new Date("2026-05-23T10:00:00.000Z"),
    lastFailurePhase: "init",
    failureCount: 2,
    lastError: Object.assign(new Error("init exploded"), {
      name: "PluginLifecycleError"
    })
  });

  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    runtimeStore: store
  });

  await bootstrapDiscoveredPlugins({
    runtime,
    discoveryService: createDiscoveryService({
      plugins: [createPlugin("cms/plugin-content")],
      sources: []
    }),
    pluginSources: []
  });

  const record = runtime.list().find((item) => item.manifest.id === "cms/plugin-content");
  assert.equal(record?.state, "failed");
  assert.equal(record?.failureCount, 2);
  assert.equal(
    runtime.events().some((event) => event.action === "load"),
    false
  );
});

test("bootstrapDiscoveredPlugins marks persisted plugins without current source", async () => {
  const store = new InMemoryPluginRuntimeStore();
  await store.upsert({
    manifest: {
      id: "cms/plugin-orphan",
      version: "1.0.0",
      requiresCore: "^0.1.0"
    },
    state: "loaded",
    loadedAt: new Date("2026-05-23T10:00:00.000Z")
  });

  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    runtimeStore: store
  });

  await bootstrapDiscoveredPlugins({
    runtime,
    discoveryService: createDiscoveryService({
      plugins: [],
      sources: []
    }),
    pluginSources: []
  });

  const record = runtime.list().find((item) => item.manifest.id === "cms/plugin-orphan");
  assert.equal(record?.state, "failed");
  assert.equal(record?.statusReason?.code, "plugin_source_missing");
});

function createDiscoveryService(result: PluginDiscoveryResult): PluginDiscoveryService {
  return {
    async discover() {
      return result;
    }
  };
}

function createPlugin(
  id: string,
  dependencies: KernelPluginDefinition["manifest"]["dependencies"] = []
): KernelPluginDefinition {
  return {
    manifest: {
      id,
      version: "1.0.0",
      requiresCore: "^0.1.0",
      dependencies
    }
  };
}

function createSource(name: string): PluginDiscoverySource {
  return {
    type: "package",
    name,
    entrypoint: `@acme/${name}`
  };
}
