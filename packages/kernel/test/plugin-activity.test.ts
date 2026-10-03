import assert from "node:assert/strict";
import test from "node:test";
import { PluginActivityRegistry } from "../src/runtime/plugin-runtime/plugin-activity.js";

test("drain denies new work and waits for existing work; timeout preserves active work", async () => {
  const registry = new PluginActivityRegistry();
  let finish!: () => void, signal!: AbortSignal;
  const running = registry.run(["catalog"], async value => { signal = value; await new Promise<void>(resolve => { finish = resolve; }); });
  await assert.rejects(registry.drain("catalog", 5), /remains active/);
  assert.equal(signal.aborted, true); assert.deepEqual(registry.snapshot("catalog"), { active: 1, blocked: true });
  await assert.rejects(registry.run(["catalog"], async () => undefined), /does not accept/);
  assert.throws(() => registry.resume("catalog"), /undrained/);
  finish(); await running; await registry.drain("catalog"); registry.resume("catalog");
  await registry.run(["catalog"], async () => undefined);
  assert.deepEqual(registry.snapshot("catalog"), { active: 0, blocked: false });
});
