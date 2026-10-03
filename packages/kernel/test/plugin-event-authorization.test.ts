import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { TrinacriaApp, valueProvider } from "@trinacria/core";
import { createEventsPlugin, EVENT_BUS_TOKEN } from "@trinacria/events";
import type {
  KernelPluginDefinition,
  PluginEventDeliveryDiagnostic,
  PluginEventSubscriptionAuthorizer,
  PluginManifestEmittedEvent
} from "../src/contracts/index.js";
import { PluginRuntimeError } from "../src/errors/index.js";
import { InMemoryPluginRuntime, InMemoryPluginRuntimeStore } from "../src/runtime/index.js";
import { createCmsStarterKernelModule } from "../src/runtime/cms-starter/starter-module.js";
import { CORE_TOKENS } from "../src/tokens/index.js";

const eventName = "producer:message";
const permission = "producer:events:consume";

async function fixture(
  t: TestContext,
  authorizer?: PluginEventSubscriptionAuthorizer,
  onDeliveryDiagnostic?: (diagnostic: PluginEventDeliveryDiagnostic) => void | Promise<void>,
  diPolicy?: PluginEventSubscriptionAuthorizer
) {
  const app = new TrinacriaApp();
  app.use(createEventsPlugin({ stopOnError: true }));
  if (diPolicy)
    app.registerGlobalProvider(
      valueProvider(CORE_TOKENS.PLUGIN_EVENT_SUBSCRIPTION_AUTHORIZER, diPolicy)
    );
  await app.start();
  t.after(() => app.shutdown());
  const bus = await app.resolve(EVENT_BUS_TOKEN);
  const runtimeStore = new InMemoryPluginRuntimeStore();
  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    app,
    eventSubscriptionAuthorizer: authorizer,
    onDeliveryDiagnostic,
    runtimeStore
  });
  return { app, bus, runtime, runtimeStore };
}

function producer(
  visibility: PluginManifestEmittedEvent["visibility"] = "protected"
): KernelPluginDefinition {
  return {
    manifest: {
      id: "producer",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      events: { emits: [{ name: "message", visibility, version: 1 , delivery: "sync" }] },
      security: { permissions: [{ key: permission, displayName: "Consume messages" }] }
    }
  };
}

function consumer(
  id = "consumer",
  handler: () => void | Promise<void> = () => {},
  requiredPermission: string | undefined = permission
): KernelPluginDefinition {
  return {
    manifest: {
      id,
      version: "1.0.0",
      requiresCore: "^0.1.0",
      events: { subscribes: [{ eventName, handler: "receive", requiredPermission }] }
    },
    eventHandlers: { receive: handler }
  };
}

function barrier() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

for (const visibility of ["protected", "audit"] as const) {
  for (const ownEvent of [false, true]) {
    test(`${visibility} needs an authorizer even for owner=${ownEvent}`, async (t) => {
      const { runtime, bus, runtimeStore } = await fixture(t);
      const source = producer(visibility);
      if (ownEvent) {
        source.manifest.events!.subscribes = consumer().manifest.events!.subscribes;
        source.eventHandlers = consumer().eventHandlers;
      }
      await runtime.register(source);
      if (!ownEvent) await runtime.register(consumer());
      const id = ownEvent ? "producer" : "consumer";
      await assert.rejects(runtime.load(id), (error: unknown) => {
        assert.ok(error instanceof PluginRuntimeError);
        assert.equal(error.details?.reason, "event_subscription_authorizer_missing");
        return true;
      });
      assert.equal(bus.listenerCount(), 0);
      assert.equal(runtime.list().find((record) => record.manifest.id === id)?.state, "failed");
      assert.equal(
        (await runtimeStore.list()).find((record) => record.pluginId === id)?.state,
        "failed"
      );
    });
  }
}

for (const visibility of ["public", "private"] as const) {
  test(`${visibility} declared access works without an authorizer`, async (t) => {
    const { runtime } = await fixture(t);
    let calls = 0;
    const source = producer(visibility);
    if (visibility === "private") {
      source.manifest.events!.subscribes = consumer().manifest.events!.subscribes;
      source.eventHandlers = {
        receive() {
          calls++;
        }
      };
    }
    await runtime.register(source);
    await runtime.load("producer");
    if (visibility === "public") {
      await runtime.register(
        consumer("consumer", () => {
          calls++;
        })
      );
      await runtime.load("consumer");
    }
    await runtime.emitPluginEvent("producer", "message", {});
    assert.equal(calls, 1);
  });
}

for (const requiredPermission of [
  undefined,
  "consumer:events:consume",
  "producer:events:unknown"
]) {
  test(`permissive policy cannot override invalid permission ${requiredPermission}`, async (t) => {
    let policyCalls = 0;
    const { runtime, bus } = await fixture(t, {
      canSubscribe() {
        policyCalls++;
        return { allowed: true };
      }
    });
    await runtime.register(producer());
    const target = consumer();
    target.manifest.events!.subscribes![0]!.requiredPermission = requiredPermission;
    await runtime.register(target);
    await assert.rejects(
      runtime.load("consumer"),
      /requiredPermission|event-owner|undeclared permission/
    );
    assert.equal(policyCalls, 0);
    assert.equal(bus.listenerCount(), 0);
  });
}

test("private events cannot be granted to another owner", async (t) => {
  const { runtime } = await fixture(t, { canSubscribe: () => ({ allowed: true }) });
  await runtime.register(producer("private"));
  await runtime.register(consumer());
  await assert.rejects(runtime.load("consumer"), /private event/);
});

for (const kind of ["denied", "throw", "invalid"] as const) {
  test(`policy ${kind} fails closed at load and delivery without exposing errors`, async (t) => {
    let approve = false;
    const diagnostics: PluginEventDeliveryDiagnostic[] = [];
    const { runtime, bus } = await fixture(
      t,
      {
        canSubscribe() {
          if (approve) return { allowed: true };
          if (kind === "throw") throw new Error("secret-policy-payload");
          if (kind === "invalid") return { allowed: "true" } as unknown as { allowed: boolean };
          return { allowed: false, reason: "secret-policy-payload" };
        }
      },
      (item) => {
        diagnostics.push(item);
      }
    );
    let calls = 0;
    await runtime.register(producer());
    await runtime.register(
      consumer("consumer", () => {
        calls++;
      })
    );
    await runtime.load("producer");
    await assert.rejects(runtime.load("consumer"), (error: unknown) => {
      assert.ok(error instanceof PluginRuntimeError);
      assert.equal(
        error.details?.reason,
        kind === "denied" ? "event_subscription_denied" : "event_subscription_policy_error"
      );
      assert.equal(JSON.stringify(error).includes("secret-policy-payload"), false);
      return true;
    });
    assert.equal(bus.listenerCount(), 0);
    approve = true;
    // Approval alone never auto-loads a failed consumer.
    await runtime.emitPluginEvent("producer", "message", {});
    assert.equal(calls, 0);
    await runtime.load("consumer");
    await runtime.emitPluginEvent("producer", "message", {});
    approve = false;
    await runtime.emitPluginEvent("producer", "message", { secret: "private-payload" });
    assert.equal(calls, 1);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0]?.outcome, kind === "denied" ? "denied" : "policy-error");
    assert.deepEqual(
      Object.keys(diagnostics[0]!).sort(),
      ["timestamp", "pluginId", "ownerPluginId", "eventName", "eventId", "outcome", "reason"].sort()
    );
    assert.equal(JSON.stringify(diagnostics).includes("private-payload"), false);
  });
}

test("DI policy is resolved for every delivery and explicit policy takes precedence", async (t) => {
  let approved = true;
  let diCalls = 0;
  const { app, runtime } = await fixture(t, undefined, undefined, {
    canSubscribe() {
      diCalls++;
      return { allowed: approved };
    }
  });
  let calls = 0;
  await runtime.register(producer());
  await runtime.register(
    consumer("consumer", () => {
      calls++;
    })
  );
  await runtime.loadMany();
  await runtime.emitPluginEvent("producer", "message", {});
  const beforeRevocation = diCalls;
  approved = false;
  await runtime.emitPluginEvent("producer", "message", {});
  assert.equal(calls, 1);
  assert.equal(diCalls, beforeRevocation + 1);
  const explicit = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    app,
    eventSubscriptionAuthorizer: { canSubscribe: () => ({ allowed: true }) }
  });
  await explicit.register(producer());
  await explicit.register(consumer());
  await explicit.load("consumer");
  assert.equal(diCalls, beforeRevocation + 1);
});

test("revoked consumer and failing diagnostics do not interrupt another consumer", async (t) => {
  let revoked = false;
  const diagnostics: PluginEventDeliveryDiagnostic[] = [];
  const { runtime } = await fixture(
    t,
    {
      canSubscribe: (request) => ({
        allowed: request.subscriberPluginId !== "first" || !revoked
      })
    },
    async (item) => {
      diagnostics.push(item);
      throw new Error("secret-diagnostic-error");
    }
  );
  const calls: string[] = [];
  await runtime.register(producer());
  await runtime.register(
    consumer("first", () => {
      calls.push("first");
    })
  );
  await runtime.register(
    consumer("second", () => {
      calls.push("second");
    })
  );
  await runtime.loadMany();
  await runtime.emitPluginEvent("producer", "message", {});
  revoked = true;
  await runtime.emitPluginEvent("producer", "message", {});
  assert.deepEqual(calls, ["first", "second", "second"]);
  assert.equal(diagnostics[0]?.reason, "event_subscription_denied");
});

test("application handler errors retain stopOnError behavior", async (t) => {
  const { runtime } = await fixture(t, { canSubscribe: () => ({ allowed: true }) });
  await runtime.register(producer());
  await runtime.register(
    consumer("consumer", () => {
      throw new Error("application failure");
    })
  );
  await runtime.loadMany();
  await assert.rejects(runtime.emitPluginEvent("producer", "message", {}), /application failure/);
});

for (const action of ["unload", "disable", "reload"] as const) {
  test(`${action} while policy awaits prevents stale delivery`, async (t) => {
    const entered = barrier();
    const release = barrier();
    let block = false;
    const diagnostics: PluginEventDeliveryDiagnostic[] = [];
    const { runtime } = await fixture(
      t,
      {
        async canSubscribe() {
          if (block) {
            entered.resolve();
            await release.promise;
          }
          return { allowed: true };
        }
      },
      (item) => {
        diagnostics.push(item);
      }
    );
    let calls = 0;
    await runtime.register(producer());
    await runtime.register(
      consumer("consumer", () => {
        calls++;
      })
    );
    await runtime.loadMany();
    block = true;
    const pending = runtime.emitPluginEvent("producer", "message", {});
    await entered.promise;
    block = false;
    await runtime[action]("consumer");
    release.resolve();
    await pending;
    assert.equal(calls, 0);
    assert.equal(diagnostics[0]?.reason, "plugin_generation_inactive");
    if (action === "reload") {
      await runtime.emitPluginEvent("producer", "message", {});
      assert.equal(calls, 1);
    }
  });
}

test("a bus listener snapshot cannot invoke an unloaded public consumer", async (t) => {
  const { runtime, bus } = await fixture(t);
  const entered = barrier();
  const release = barrier();
  const off = bus.on(eventName, async () => {
    entered.resolve();
    await release.promise;
  });
  t.after(off);
  let calls = 0;
  await runtime.register(producer("public"));
  await runtime.register(
    consumer("consumer", () => {
      calls++;
    })
  );
  await runtime.loadMany();
  const pending = runtime.emitPluginEvent("producer", "message", {});
  await entered.promise;
  await runtime.reload("consumer");
  release.resolve();
  await pending;
  assert.equal(calls, 0);
  await runtime.emitPluginEvent("producer", "message", {});
  assert.equal(calls, 1);
});

test("partial binding failure rolls back modules, contributions and listeners; retry has no duplicates", async (t) => {
  const { runtime, bus, app, runtimeStore } = await fixture(t);
  await runtime.register(producer("public"));
  await runtime.load("producer");
  let calls = 0;
  let unloads = 0;
  const target = consumer("consumer", () => {
    calls++;
  });
  target.manifest.entities = [{ name: "records", schemaVersion: 1 }];
  target.manifest.events!.subscribes!.push({ eventName, handler: "receiveSecond" });
  target.eventHandlers = {
    receive: () => {
      calls++;
    },
    receiveSecond: () => {
      calls++;
    }
  };
  target.modules = [{ name: "module:consumer" }];
  target.onUnload = () => {
    unloads++;
  };
  await runtime.register(target);
  const on = bus.on.bind(bus);
  let bindings = 0;
  bus.on = (...args) => {
    if (++bindings === 2) throw new Error("second binding failed");
    return on(...args);
  };
  await assert.rejects(runtime.load("consumer"), /failed during load/);
  assert.equal(bus.listenerCount(), 0);
  assert.equal(app.listModules().includes("module:consumer"), false);
  assert.equal(runtime.describeContributions().entities.length, 0);
  assert.equal(runtime.list().find((item) => item.manifest.id === "consumer")?.state, "failed");
  assert.equal(
    (await runtimeStore.list()).find((item) => item.pluginId === "consumer")?.state,
    "failed"
  );
  assert.equal(runtime.list().find((item) => item.manifest.id === "producer")?.state, "loaded");
  assert.equal(unloads, 1);
  bus.on = on;
  await runtime.load("consumer");
  assert.equal(bus.listenerCount(), 2);
  await runtime.emitPluginEvent("producer", "message", {});
  assert.equal(calls, 2);
  await runtime.disable("consumer");
  assert.equal(bus.listenerCount(), 0);
});

for (const approve of [true, false, undefined]) {
  test(`recursive dependency subscriptions use the same load path (approved=${approve})`, async (t) => {
    const { runtime, bus, runtimeStore } = await fixture(
      t,
      approve === undefined ? undefined : { canSubscribe: () => ({ allowed: approve }) }
    );
    let calls = 0;
    await runtime.register(producer());
    const dependency = consumer("dependency", () => {
      calls++;
    });
    await runtime.register(dependency);
    await runtime.register({
      id: "root",
      version: "1.0.0",
      requiresCore: "^0.1.0",
      dependencies: [{ pluginId: "dependency", versionRange: "^1.0.0" }]
    });
    if (approve) {
      await runtime.load("root");
      await runtime.load("producer");
      await runtime.emitPluginEvent("producer", "message", {});
      assert.equal(calls, 1);
      assert.equal(bus.listenerCount(), 1);
      // A rejected unload must not detach a shared dependency's subscriptions.
      await assert.rejects(runtime.unload("dependency"), /dependents/);
      await assert.rejects(runtime.disable("dependency"), /dependents/);
      await runtime.emitPluginEvent("producer", "message", {});
      assert.equal(calls, 2);
    } else {
      await assert.rejects(
        runtime.load("root"),
        /not authorized|requires an event subscription authorizer/
      );
      assert.equal(bus.listenerCount(), 0);
      assert.equal(
        (await runtimeStore.list()).find((item) => item.pluginId === "dependency")?.state,
        "failed"
      );
    }
  });
}

test("policy changing between preflight and binding rolls back the whole attempt", async (t) => {
  let evaluations = 0;
  const { runtime, bus, app } = await fixture(t, {
    canSubscribe() {
      return { allowed: ++evaluations !== 4 };
    }
  });
  await runtime.register(producer());
  const target = consumer();
  target.manifest.events!.subscribes!.push({
    eventName,
    handler: "second",
    requiredPermission: permission
  });
  target.eventHandlers = { receive() {}, second() {} };
  target.modules = [{ name: "module:partial-policy" }];
  await runtime.register(target);
  await assert.rejects(runtime.load("consumer"), /failed during load/);
  assert.equal(evaluations, 4);
  assert.equal(bus.listenerCount(), 0);
  assert.equal(app.listModules().includes("module:partial-policy"), false);
  await runtime.load("consumer");
  assert.equal(bus.listenerCount(), 2);
});

test("wildcard subscription cannot bypass a matching protected producer", async (t) => {
  const { runtime, bus } = await fixture(t);
  await runtime.register(producer());
  await runtime.register({
    id: "public-source",
    version: "1.0.0",
    requiresCore: "^0.1.0",
    events: { emits: [{ name: "message", visibility: "public", version: 1 , delivery: "sync" }] }
  });
  const target = consumer();
  target.manifest.events!.subscribes![0]!.eventName = "*:message";
  await runtime.register(target);
  await assert.rejects(runtime.load("consumer"), /requires an event subscription authorizer/);
  assert.equal(bus.listenerCount(), 0);
});

test("automatic retry after binding failure cannot duplicate handlers or modules", async (t) => {
  const { app, bus } = await fixture(t);
  const runtime = new InMemoryPluginRuntime({
    coreVersion: "0.1.0",
    app,
    retryPolicy: { maxAttempts: 1 }
  });
  await runtime.register(producer("public"));
  await runtime.load("producer");
  let calls = 0;
  const target = consumer("consumer", () => {
    calls++;
  });
  target.modules = [{ name: "module:retry" }];
  target.manifest.events!.subscribes!.push({ eventName, handler: "second" });
  target.eventHandlers = {
    receive: () => {
      calls++;
    },
    second: () => {
      calls++;
    }
  };
  await runtime.register(target);
  const on = bus.on.bind(bus);
  let bindings = 0;
  bus.on = (...args) => {
    if (++bindings === 2) throw new Error("transient binding failure");
    return on(...args);
  };
  await runtime.load("consumer");
  assert.equal(bus.listenerCount(), 2);
  assert.equal(app.listModules().filter((name) => name === "module:retry").length, 1);
  await runtime.emitPluginEvent("producer", "message", {});
  assert.equal(calls, 2);
  await runtime.unload("consumer");
  assert.equal(bus.listenerCount(), 0);
});

test("unload drains an already-started handler before removing the generation", async (t) => {
  const { runtime } = await fixture(t, { canSubscribe: () => ({ allowed: true }) });
  const entered = barrier();
  const release = barrier();
  let completed = 0;
  await runtime.register(producer());
  await runtime.register(
    consumer("consumer", async () => {
      entered.resolve();
      await release.promise;
      completed++;
    })
  );
  await runtime.loadMany();
  const pending = runtime.emitPluginEvent("producer", "message", {});
  await entered.promise;
  const draining = runtime.unload("consumer");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(runtime.activity.snapshot("consumer").active, 1);
  assert.equal(runtime.activity.snapshot("consumer").blocked, true);
  release.resolve();
  await pending;
  await draining;
  assert.equal(completed, 1);
  await runtime.emitPluginEvent("producer", "message", {});
  assert.equal(completed, 1);
});

test("CMS starter forwards redacted delivery diagnostics to the host callback", async (t) => {
  const app = new TrinacriaApp();
  app.use(createEventsPlugin({ stopOnError: true }));
  let approved = true;
  const diagnostics: PluginEventDeliveryDiagnostic[] = [];
  app.registerGlobalProvider(
    valueProvider(CORE_TOKENS.PLUGIN_EVENT_SUBSCRIPTION_AUTHORIZER, {
      canSubscribe: () => ({ allowed: approved })
    })
  );
  await app.registerModule(
    createCmsStarterKernelModule({
      app,
      options: {
        coreVersion: "0.1.0",
        enablePluginManifestProvisioning: false,
        onPluginEventDeliveryDiagnostic: (item) => {
          diagnostics.push(item);
        }
      },
      swaggerUi: { enabled: false },
      pluginSourceSnapshots: () => []
    })
  );
  await app.start();
  t.after(() => app.shutdown());
  const runtime = await app.resolve(CORE_TOKENS.PLUGIN_RUNTIME);
  await runtime.register(producer());
  await runtime.register(consumer());
  await runtime.loadMany();
  approved = false;
  await runtime.emitPluginEvent("producer", "message", { secret: "never-log-this" });
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.reason, "event_subscription_denied");
  assert.equal(JSON.stringify(diagnostics).includes("never-log-this"), false);
});
