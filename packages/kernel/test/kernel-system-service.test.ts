import assert from "node:assert/strict";
import test from "node:test";
import type { PluginRuntimeRecord, PluginState } from "../src/contracts/plugin-runtime.js";
import { InMemoryPluginRuntime, KernelSystemService } from "../src/runtime/index.js";
import { describeAvailableOperations } from "../src/runtime/plugin-runtime/plugin-runtime-operations.js";

test("KernelSystemService exposes operational plugin snapshots", async () => {
  const service = new KernelSystemService(
    {
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
      }),
      events: () => [],
      load: async () => {},
      unload: async () => {},
      reload: async () => {},
      disable: async () => {},
      enable: async () => {}
    },
    {
      pluginSources: () => [
        {
          type: "workspace",
          name: "content",
          entrypoint: "./plugins/content/index.ts",
          status: "discovered",
          pluginId: "cms/plugin-content"
        }
      ]
    }
  );

  const [content, users] = await service.listInstalledPlugins();

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
  assert.equal(content?.source?.type, "workspace");
  assert.equal(content?.source?.status, "discovered");
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

test("KernelSystemService exposes loaded plugin admin extension manifests", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
  await runtime.register({
    id: "blog-pack",
    displayName: "Blog Pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    admin: {
      routes: [{ id: "posts", path: "/blog/posts", label: "Posts" }],
      widgets: [{ id: "health", label: "Health", componentRef: "blog-pack:health" }]
    }
  });
  await runtime.register({
    id: "draft-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    admin: {
      routes: [{ id: "drafts", path: "/drafts", label: "Drafts" }]
    }
  });
  await runtime.load("blog-pack");

  const service = new KernelSystemService(runtime);
  const manifests = service.listAdminExtensions();

  assert.equal(manifests.length, 1);
  assert.equal(manifests[0].pluginId, "blog-pack");
  assert.equal(manifests[0].displayName, "Blog Pack");
  assert.equal(manifests[0].admin.routes?.[0]?.path, "/blog/posts");
  assert.equal(manifests[0].admin.widgets?.[0]?.componentRef, "blog-pack:health");
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

test("KernelSystemService uses shared coordination when explicitly configured", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
  const input = { operation: "enable" as const, expectedRevision: 1, idempotencyKey: "operator-command" };
  const result = { operationId: "operation", pluginId: "example", status: "pending" };
  const service = new KernelSystemService(runtime, { coordinator: async () => ({ submit: async (id: string, actual: unknown, actor: string) => { assert.equal(id, "example"); assert.deepEqual(actual, input); assert.equal(actor, "operator"); return result; }, status: async () => result }) as never });
  assert.deepEqual(await service.executeOperation("example", input, "operator"), result);
  assert.deepEqual(await service.getPluginOperation("operation"), result);
});

test("local lifecycle operations work without cluster, reject stale state and deduplicate retries", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
  let loads = 0;
  await runtime.register({ manifest: { id: "example", version: "0.1.0", requiresCore: "^0.1.0" }, onLoad() { loads++; } });
  const service = new KernelSystemService(runtime);
  const before = (await service.getInstalledPlugin("example"))!;
  assert.equal(before.executionMode, "local"); assert.equal(before.cluster, undefined);
  const input = { operation: "load" as const, expectedRevision: before.operationRevision, idempotencyKey: "first-command" };
  const [first, retry] = await Promise.all([service.executeOperation("example", input, "operator"), service.executeOperation("example", input, "operator")]);
  assert.deepEqual(first, retry); assert.equal(first.status, "succeeded"); assert.equal(loads, 1);
  assert.deepEqual(await service.getPluginOperation(first.operationId), first);
  await assert.rejects(service.executeOperation("example", { ...input, operation: "reload" }, "operator"), /Idempotency/);
  await assert.rejects(service.executeOperation("example", { ...input, operation: "reload", idempotencyKey: "stale-command" }, "operator"), /state changed/);
  const loaded = (await service.getInstalledPlugin("example"))!;
  const disabled = await service.executeOperation("example", { operation: "disable", expectedRevision: loaded.operationRevision, idempotencyKey: "disable-command", reason: "operator request" }, "operator");
  assert.equal(disabled.status, "succeeded"); assert.equal(runtime.list()[0].state, "disabled");
  const snapshot = (await service.getInstalledPlugin("example"))!;
  await service.executeOperation("example", { operation: "enable", expectedRevision: snapshot.operationRevision, idempotencyKey: "enable-command" }, "operator");
  assert.equal(runtime.list()[0].state, "registered");
  await assert.rejects(service.getPluginOperation("unknown"), { code: "not_found" });
});

test("local revisions survive eviction of lifecycle diagnostics", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", eventBufferSize: 1 });
  for (const id of ["example", "other"])
    await runtime.register({ id, version: "0.1.0", requiresCore: "^0.1.0" });
  const service = new KernelSystemService(runtime);
  const before = (await service.getInstalledPlugin("example"))!;
  await runtime.load("example");
  await runtime.load("other");
  assert.equal(runtime.events({ pluginId: "example" }).length, 0);
  const loaded = (await service.getInstalledPlugin("example"))!;
  assert.ok(loaded.operationRevision > before.operationRevision);
  await assert.rejects(service.executeOperation("example", { operation: "unload", expectedRevision: before.operationRevision, idempotencyKey: "stale" }, "operator"), /state changed/);
  assert.equal((await service.executeOperation("example", { operation: "unload", expectedRevision: loaded.operationRevision, idempotencyKey: "current" }, "operator")).status, "succeeded");
});

test("local disable waits for real activity and rejects concurrent lifecycle commands", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });
  await runtime.register({ id: "example", version: "0.1.0", requiresCore: "^0.1.0" }); await runtime.load("example");
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const activity = runtime.activity.run(["example"], () => barrier);
  const service = new KernelSystemService(runtime);
  const snapshot = (await service.getInstalledPlugin("example"))!;
  const disable = service.executeOperation("example", { operation: "disable", expectedRevision: snapshot.operationRevision, idempotencyKey: "disable-command" }, "operator");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(runtime.activity.snapshot("example").blocked, true); assert.equal(runtime.list()[0].state, "loaded");
  await assert.rejects(service.executeOperation("example", { operation: "reload", expectedRevision: snapshot.operationRevision, idempotencyKey: "reload-command" }, "operator"), /already running/);
  release(); await activity; assert.equal((await disable).status, "succeeded"); assert.equal(runtime.list()[0].state, "disabled");
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
  const users = await service.getInstalledPlugin("cms/plugin-users");

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
