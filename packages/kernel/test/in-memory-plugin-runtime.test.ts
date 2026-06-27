import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationContext, ModuleDefinition } from "@trinacria/core";
import { EVENT_BUS_TOKEN, type EventBus, type EventEnvelope } from "@trinacria/events";
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
        key: "blog-pack:editorial:default-status",
        category: "editorial",
        visibility: "admin"
      }
    ],
    events: {
      emits: [{ name: "post-published", visibility: "public", version: 1 }]
    },
    admin: {
      routes: [{ id: "posts", path: "/blog/posts", label: "Posts" }]
    }
  });
  await runtime.load("blog-pack");

  const snapshot = runtime.describeContributions();
  assert.equal(snapshot.entities[0]?.key, "blog-pack:posts");
  assert.equal(snapshot.settings[0]?.key, "blog-pack:editorial:default-status");
  assert.equal(snapshot.events.emits[0]?.key, "blog-pack:post-published");
  assert.equal(snapshot.admin.routes[0]?.declaration.path, "/blog/posts");
});

test("describeContributions only exposes loaded plugin declarations", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });

  assert.equal(runtime.describeContributions().entities.length, 0);

  await runtime.load("blog-pack");

  assert.equal(runtime.describeContributions().entities.length, 1);

  await runtime.unload("blog-pack");

  assert.equal(runtime.describeContributions().entities.length, 0);
});

test("runtime binds manifest event subscriptions and dispatches plugin handlers", async () => {
  const { bus, app } = createFakeAppWithEventBus();
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });
  const received: Array<{ payload: unknown; envelope: EventEnvelope }> = [];

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    events: {
      emits: [
        {
          name: "user-created",
          visibility: "public",
          version: 1
        }
      ]
    }
  });

  await runtime.register({
    manifest: {
      id: "cms/plugin-content",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      events: {
        subscribes: [
          {
            eventName: "cms/plugin-users:user-created",
            handler: "onUserCreated"
          }
        ]
      }
    },
    eventHandlers: {
      async onUserCreated(payload, envelope) {
        received.push({ payload, envelope: envelope as EventEnvelope });
      }
    }
  });

  await runtime.load("cms/plugin-content");
  await bus.emit("cms/plugin-users:user-created", { id: "u-1" });

  assert.equal(received.length, 1);
  assert.deepEqual(received[0]?.payload, { id: "u-1" });

  await runtime.unload("cms/plugin-content");
  await bus.emit("cms/plugin-users:user-created", { id: "u-2" });
  assert.equal(received.length, 1);
});

test("runtime emits only manifest-declared plugin events and validates payload schemas", async () => {
  const { bus, app } = createFakeAppWithEventBus();
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });
  const emitted: unknown[] = [];
  bus.on("cms/plugin-users:password-reset-requested", (payload) => {
    emitted.push(payload);
  });

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    events: {
      emits: [
        {
          name: "password-reset-requested",
          visibility: "protected",
          version: 1,
          payloadSchema: {
            type: "object",
            required: ["userId", "resetUrl"],
            properties: {
              userId: { type: "string" },
              resetUrl: { type: "string" }
            }
          }
        }
      ]
    }
  });

  await runtime.load("cms/plugin-users");
  await runtime.emitPluginEvent("cms/plugin-users", "password-reset-requested", {
    userId: "u-1",
    resetUrl: "https://example.test/reset"
  });

  assert.deepEqual(emitted, [
    {
      userId: "u-1",
      resetUrl: "https://example.test/reset"
    }
  ]);

  await assert.rejects(
    () =>
      runtime.emitPluginEvent("cms/plugin-users", "password-reset-requested", { userId: "u-1" }),
    /payloadSchema/
  );
  await assert.rejects(
    () => runtime.emitPluginEvent("cms/plugin-users", "undeclared", {}),
    /undeclared event/
  );
});

test("runtime enforces event subscription visibility rules", async () => {
  const { app } = createFakeAppWithEventBus();
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    events: {
      emits: [
        { name: "private-user-token-created", visibility: "private", version: 1 },
        { name: "user-email-verification-requested", visibility: "protected", version: 1 }
      ]
    },
    security: {
      permissions: [
        {
          key: "cms/plugin-users:events:consume",
          displayName: "Consume user lifecycle events"
        }
      ]
    }
  });

  await runtime.register({
    manifest: {
      id: "cms/plugin-email",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      events: {
        subscribes: [
          {
            eventName: "cms/plugin-users:private-user-token-created",
            handler: "onPrivate"
          }
        ]
      }
    },
    eventHandlers: {
      async onPrivate() {}
    }
  });

  await assert.rejects(() => runtime.load("cms/plugin-email"), /private event/);

  await runtime.unregister("cms/plugin-email");
  await runtime.register({
    manifest: {
      id: "cms/plugin-email",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      events: {
        subscribes: [
          {
            eventName: "cms/plugin-users:user-email-verification-requested",
            handler: "onVerificationRequested"
          }
        ]
      }
    },
    eventHandlers: {
      async onVerificationRequested() {}
    }
  });

  await assert.rejects(() => runtime.load("cms/plugin-email"), /requiredPermission/);

  await runtime.unregister("cms/plugin-email");
  await runtime.register({
    manifest: {
      id: "cms/plugin-email",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      events: {
        subscribes: [
          {
            eventName: "cms/plugin-users:user-email-verification-requested",
            handler: "onVerificationRequested",
            requiredPermission: "cms/plugin-users:events:consume"
          }
        ]
      }
    },
    eventHandlers: {
      async onVerificationRequested() {}
    }
  });

  await runtime.load("cms/plugin-email");
});

test("runtime supports explicit authorization for protected event subscribers", async () => {
  const { app } = createFakeAppWithEventBus();
  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    app,
    eventSubscriptionAuthorizer: {
      canSubscribe(request) {
        return {
          allowed: request.subscriberPluginId === "cms/plugin-email",
          reason: "subscriber_not_approved"
        };
      }
    }
  });

  await runtime.register({
    id: "cms/plugin-users",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    events: {
      emits: [{ name: "secure-event-payload-ready", visibility: "protected", version: 1 }]
    },
    security: {
      permissions: [
        {
          key: "cms/plugin-users:secure-payloads:claim",
          displayName: "Claim user secure payloads"
        }
      ]
    }
  });

  await runtime.register({
    manifest: {
      id: "cms/plugin-third-party",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      events: {
        subscribes: [
          {
            eventName: "cms/plugin-users:secure-event-payload-ready",
            handler: "onPasswordResetEmailReady",
            requiredPermission: "cms/plugin-users:secure-payloads:claim"
          }
        ]
      }
    },
    eventHandlers: {
      async onPasswordResetEmailReady() {}
    }
  });

  await assert.rejects(() => runtime.load("cms/plugin-third-party"), /not authorized/);

  await runtime.register({
    manifest: {
      id: "cms/plugin-email",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      events: {
        subscribes: [
          {
            eventName: "cms/plugin-users:secure-event-payload-ready",
            handler: "onPasswordResetEmailReady",
            requiredPermission: "cms/plugin-users:secure-payloads:claim"
          }
        ]
      }
    },
    eventHandlers: {
      async onPasswordResetEmailReady() {}
    }
  });

  await runtime.load("cms/plugin-email");
});

test("load failure removes partial plugin contributions and records diagnostic context", async () => {
  const app = createFakeApp();
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0", app });

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

  const [record] = runtime.list();
  const [event] = runtime.events({ pluginId: "blog-pack", limit: 1 });

  assert.equal(runtime.describeContributions().entities.length, 0);
  assert.equal(record?.state, "failed");
  assert.equal(record?.lastFailurePhase, "init");
  assert.equal(record?.failureCount, 1);
  assert.equal(event?.action, "load");
  assert.equal(event?.success, false);
  assert.equal(event?.phase, "init");
  assert.equal(event?.details?.failureCount, 1);
});

test("disable removes loaded plugin contributions", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });
  await runtime.load("blog-pack");

  assert.equal(runtime.describeContributions().entities.length, 1);

  await runtime.disable("blog-pack", "operator stop");

  assert.equal(runtime.describeContributions().entities.length, 0);
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

test("unregister removes plugin contribution reservations from runtime catalog", async () => {
  const runtime = new InMemoryPluginRuntime({ coreVersion: "0.1.0" });

  await runtime.register({
    id: "blog-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });
  await runtime.load("blog-pack");
  await runtime.unload("blog-pack");

  await runtime.unregister("blog-pack");
  await runtime.register({
    id: "commerce-pack",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    entities: [{ name: "posts", schemaVersion: 1 }]
  });

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
    ["unload", "disable"]
  );
  assert.equal(events[0]?.sequence, 3);
  assert.equal(events[1]?.sequence, 4);
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

function createFakeAppWithEventBus(): {
  app: ApplicationContext;
  bus: EventBus;
} {
  const listeners = new Map<
    string,
    Array<(payload: unknown, envelope: EventEnvelope) => Promise<void> | void>
  >();

  const bus: EventBus = {
    async emit(event, payload) {
      const eventListeners = listeners.get(event) ?? [];
      const envelope: EventEnvelope = {
        id: `${event}-${Date.now()}`,
        name: event,
        payload,
        publishedAt: new Date()
      };
      for (const listener of eventListeners) {
        await listener(payload, envelope);
      }
    },
    on(event, handler) {
      const existing = listeners.get(event) ?? [];
      existing.push(handler as (payload: unknown, envelope: EventEnvelope) => Promise<void> | void);
      listeners.set(event, existing);
      return () => {
        const next = (listeners.get(event) ?? []).filter((item) => item !== handler);
        listeners.set(event, next);
      };
    },
    once(event, handler) {
      const wrapped = async (payload: unknown, envelope: EventEnvelope) => {
        off();
        await (handler as (payload: unknown, envelope: EventEnvelope) => Promise<void> | void)(
          payload,
          envelope
        );
      };
      const off = this.on(event, wrapped);
      return off;
    },
    off(event, handler) {
      const next = (listeners.get(event) ?? []).filter((item) => item !== handler);
      listeners.set(event, next);
    },
    listenerCount(event) {
      if (event) return (listeners.get(event) ?? []).length;
      return Array.from(listeners.values()).reduce((acc, current) => acc + current.length, 0);
    }
  };

  const app = createFakeApp();
  const appWithEvents: ApplicationContext = {
    ...app,
    hasToken(token) {
      return token === EVENT_BUS_TOKEN;
    },
    async resolve(token: unknown) {
      if (token === EVENT_BUS_TOKEN) {
        return bus;
      }
      throw new Error("not implemented in test");
    }
  };

  return { app: appWithEvents, bus };
}
