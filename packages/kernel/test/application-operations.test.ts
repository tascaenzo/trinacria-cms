import assert from "node:assert/strict";
import test from "node:test";
import { createApplicationOperations } from "../src/runtime/operations/application-operations.js";
import { bindHttpOperationContext, createUserOperationContext, getHttpOperationContext, operationForbidden } from "../src/runtime/operations/operation-context.js";
import { createKernelSystemOperations } from "../src/runtime/operations/kernel-system-operations.js";
import { KernelSystemHttpController } from "../src/http/system/kernel-system.controller.js";
import { createCmsStarterKernelModule } from "../src/runtime/cms-starter/starter-module.js";
import { CORE_TOKENS } from "../src/tokens/core-tokens.js";
import { TrinacriaApp, defineModule, valueProvider } from "@trinacria/core";
const user = createUserOperationContext("operator");

test("operation input is snapshotted before a suspended policy can mutate the target", async () => {
  let release!: () => void, entered!: () => void;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<void>((resolve) => { entered = resolve; });
  const operations = createApplicationOperations({ write: async (input: { id: string }) => input.id }, { assert: async () => { entered(); await barrier; } }, { write: { target: (args) => ({ ownerPluginId: "owner", resource: "records", action: "write", resourceId: (args[0] as { id: string }).id }) } });
  const input = { id: "authorized" }; const pending = operations.write(user, input);
  await ready; input.id = "foreign"; release(); assert.equal(await pending, "authorized");
  assert.equal(Object.isFrozen(operations), true);
});

test("HTTP principal comes from a certified binding and permission denial is 403", async () => {
  const ctx = { params: {}, state: { userId: "admin", operationContext: user } };
  assert.throws(() => getHttpOperationContext(ctx), (error: unknown) => (error as { code: string }).code === "operation_forbidden");
  bindHttpOperationContext(ctx, user);
  let touched = false;
  const operations = createKernelSystemOperations({ listInstalledPlugins: () => { touched = true; return []; } } as never, { assert: async () => { throw operationForbidden(); } });
  const route = new KernelSystemHttpController(operations).routes().find((entry) => entry.path === "/v1/system/plugins")!;
  const response = await route.handler(ctx as never);
  assert.equal(response.status, 403); assert.equal(touched, false);
});

test("runtime read permission never authorizes lifecycle writes", async () => {
  let writes = 0;
  const operations = createKernelSystemOperations({ executeOperation: async () => { writes++; } } as never, { assert: async (_ctx, target) => { if (target.action !== "read") throw operationForbidden(); } });
  await assert.rejects(operations.executeOperation(user, "plugin", { operation: "load" }), (error: unknown) => (error as { code: string }).code === "operation_forbidden");
  assert.equal(writes, 0);
});

test("starter operation policy is deny by default and resolved after runtime registration", async (t) => {
  const app = new TrinacriaApp();
  await app.registerModule(createCmsStarterKernelModule({ app, options: { coreVersion: "0.1.0", enableHealthModule: false }, swaggerUi: { enabled: false }, pluginSourceSnapshots: () => [] }));
  await app.start(); t.after(() => app.shutdown());
  const authorizer = await app.resolve(CORE_TOKENS.OPERATION_AUTHORIZER);
  const target = { ownerPluginId: "owner", resource: "records", action: "read" };
  await assert.rejects(authorizer.assert(user, target));
  let calls = 0;
  await app.registerModule(defineModule({ name: "Policy", providers: [valueProvider(CORE_TOKENS.OPERATION_POLICY, { assert: async () => { calls++; } })], exports: [CORE_TOKENS.OPERATION_POLICY] }));
  await authorizer.assert(user, target); assert.equal(calls, 1);
});
