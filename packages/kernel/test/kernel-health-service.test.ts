import assert from "node:assert/strict";
import test from "node:test";
import type {
  PluginDependencyGraphSnapshot,
  PluginRuntimeRecord,
} from "../src/contracts/plugin-runtime.js";
import { KernelHealthService } from "../src/runtime/index.js";

test("KernelHealthService returns ok when runtime and db are healthy", async () => {
  const service = new KernelHealthService({
    runtime: {
      list: () => [
        {
          manifest: {
            id: "cms/plugin-content",
            version: "1.0.0",
            requiresCore: "^0.1.0",
          },
          state: "loaded",
        },
      ],
      describeDependencies: () => ({
        nodes: [
          { pluginId: "cms/plugin-content", state: "loaded", version: "1.0.0" },
        ],
        edges: [],
        warnings: [],
      }),
    },
    dbAdapter: {
      async healthCheck() {
        return { ok: true };
      },
    },
  });

  const snapshot = await service.snapshot();
  assert.equal(snapshot.status, "ok");
  assert.equal(snapshot.runtime.totalPlugins, 1);
  assert.deepEqual(snapshot.issues, []);
});

test("KernelHealthService returns degraded on plugin failure and required dependency issue", async () => {
  const service = new KernelHealthService({
    runtime: {
      list: () => makeRecords([{ state: "failed", id: "cms/plugin-content" }]),
      describeDependencies: () =>
        makeGraph([
          {
            from: "cms/plugin-content",
            to: "cms/plugin-users",
            optional: false,
            requiredRange: "^1.0.0",
            status: "missing",
          },
        ]),
    },
    dbAdapter: {
      async healthCheck() {
        return { ok: true };
      },
    },
  });

  const snapshot = await service.snapshot();
  assert.equal(snapshot.status, "degraded");
  assert.equal(
    snapshot.issues.some((issue) =>
      issue.includes("dependency:required:cms/plugin-content->cms/plugin-users:missing"),
    ),
    true,
  );
});

test("KernelHealthService returns down when db is unhealthy", async () => {
  const service = new KernelHealthService({
    runtime: {
      list: () => makeRecords([{ state: "loaded", id: "cms/plugin-content" }]),
      describeDependencies: () => makeGraph([]),
    },
    dbAdapter: {
      async healthCheck() {
        return { ok: false, reason: "mongo_unreachable" };
      },
    },
  });

  const snapshot = await service.snapshot();
  assert.equal(snapshot.status, "down");
  assert.equal(snapshot.issues.includes("db:mongo_unreachable"), true);
});

test("KernelHealthService reports db not configured as degraded signal but not down", async () => {
  const service = new KernelHealthService({
    runtime: {
      list: () => makeRecords([{ state: "loaded", id: "cms/plugin-content" }]),
      describeDependencies: () => makeGraph([]),
    },
  });

  const snapshot = await service.snapshot();
  assert.equal(snapshot.status, "ok");
  assert.equal(snapshot.db.ok, false);
  assert.equal(snapshot.issues.includes("db:not_configured"), true);
});

function makeRecords(
  items: Array<{ id: string; state: PluginRuntimeRecord["state"] }>,
): PluginRuntimeRecord[] {
  return items.map((item) => ({
    manifest: {
      id: item.id,
      version: "1.0.0",
      requiresCore: "^0.1.0",
    },
    state: item.state,
    lastFailurePhase: item.state === "failed" ? "init" : undefined,
    disabledReason: item.state === "disabled" ? "manual" : undefined,
  }));
}

function makeGraph(
  edges: PluginDependencyGraphSnapshot["edges"],
): PluginDependencyGraphSnapshot {
  return {
    nodes: [],
    edges,
    warnings: [],
  };
}
