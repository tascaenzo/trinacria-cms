import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogConsumer } from "../src/index.js";
test("consumer rejects malformed protected events before any owned effects", async () => {
  let effects = 0;
  const plugin = createCatalogConsumer();
  await assert.rejects(Promise.resolve(plugin.eventHandlers!.observe({ id: "one", version: -1 }, { id: "event" } as never, { services: { storage: { repository() { effects++; } } } } as never)));
  assert.equal(effects, 0);
});
