import assert from "node:assert/strict";
import test from "node:test";
import { defineModule, TrinacriaApp, valueProvider } from "../src/index.js";
import type { KernelAdminRouteGuard } from "../src/contracts/kernel-admin-route-guard.js";
import { KERNEL_SYSTEM_HTTP_CONTROLLER } from "../src/http/system/kernel-system.tokens.js";
import { createCmsStarterKernelModule } from "../src/runtime/cms-starter/starter-module.js";
import { CORE_TOKENS } from "../src/tokens/core-tokens.js";

test("CMS starter resolves kernel admin route guard lazily after runtime module registration", async () => {
  const app = new TrinacriaApp();

  await app.registerModule(
    createCmsStarterKernelModule({
      app,
      options: {
        coreVersion: "0.1.0"
      },
      swaggerUi: { enabled: false },
      pluginSourceSnapshots: () => []
    })
  );
  await app.start();

  try {
    const controller = await app.resolve(KERNEL_SYSTEM_HTTP_CONTROLLER);
    const route = controller.routes().find((entry) => entry.path === "/v1/system/plugins");
    assert.ok(route?.middlewares?.[0]);

    const denied = await route.middlewares[0]({} as never, async () => "next");
    assert.notEqual(denied, "next");
    assert.equal(denied?.status, 403);
    assert.equal(denied?.body.error.code, "admin_route_guard_required");

    const guard: KernelAdminRouteGuard = {
      middleware: async (_ctx, next) => next(),
      security: [{ bearerAuth: [] }]
    };

    await app.registerModule(
      defineModule({
        name: "RuntimeKernelAdminGuardModule",
        providers: [valueProvider(CORE_TOKENS.KERNEL_ADMIN_ROUTE_GUARD, guard)],
        exports: [CORE_TOKENS.KERNEL_ADMIN_ROUTE_GUARD]
      })
    );

    const allowed = await route.middlewares[0]({} as never, async () => "next");
    assert.equal(allowed, "next");
  } finally {
    await app.shutdown();
  }
});
