import assert from "node:assert/strict";
import test from "node:test";
import { KernelSystemHttpController } from "../src/http/system/kernel-system.controller.js";
import type { KernelSystemService } from "../src/runtime/system/kernel-system-service.js";

const system = {
  listInstalledPlugins: () => [],
  listCapabilities: () => [],
  listPluginContributions: () => ({
    entities: [],
    settings: [],
    events: { emits: [], subscribes: [] },
    admin: {
      navigation: [],
      routes: [],
      resources: [],
      widgets: [],
      settingsSections: []
    }
  }),
  listPluginSources: () => [],
  getInstalledPlugin: () => undefined,
  executeOperation: async () => ({
    pluginId: "test",
    operation: "load",
    state: "loaded",
    changed: false
  }),
  listPluginEvents: () => []
} as unknown as KernelSystemService;

test("KernelSystemHttpController denies system routes when no admin guard is configured", async () => {
  const routes = new KernelSystemHttpController(system).routes();
  const route = routes.find((entry) => entry.path === "/v1/system/plugins");
  assert.ok(route);
  assert.equal(route.middlewares?.length, 1);

  const result = await route.middlewares?.[0]?.({} as never, async () => "next");

  assert.notEqual(result, "next");
  assert.equal(result?.status, 403);
  assert.equal(result?.body.error.code, "admin_route_guard_required");
});

test("KernelSystemHttpController uses provided admin guard instead of fallback deny guard", () => {
  const guard = async (_ctx: never, next: () => Promise<unknown>) => next();
  const routes = new KernelSystemHttpController(system, {
    middleware: guard,
    security: [{ bearerAuth: [] }]
  }).routes();

  const route = routes.find((entry) => entry.path === "/v1/system/plugins");

  assert.equal(route?.middlewares?.[0], guard);
  assert.deepEqual(route?.docs?.security, [{ bearerAuth: [] }]);
});
