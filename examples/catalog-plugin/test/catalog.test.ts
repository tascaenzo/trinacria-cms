import assert from "node:assert/strict";
import test from "node:test";
import { createApplicationOperations, createUserOperationContext, validatePluginManifest } from "@trinacria-cms/kernel/runtime";
import { CATALOG_MANIFEST } from "../src/manifest.js";
import { CatalogService } from "../src/service.js";
import type { PluginHostServices } from "@trinacria-cms/kernel/plugin-api";

test("catalog denies unauthorized internal calls before touching storage and validates before publishing", async () => {
  const service = new CatalogService(); let touched = 0;
  service.bind({ storage: { repository() { touched++; throw new Error("Storage must not be called"); } } } as unknown as PluginHostServices);
  const facade = createApplicationOperations(service, { async assert() { throw new Error("denied"); } }, { list: { target: { ownerPluginId: "catalog-plugin", resource: "items", action: "read" } } });
  await assert.rejects(facade.list(createUserOperationContext("reader")), /denied/);
  await assert.rejects(service.create({ name: "", priceCents: -1 }));
  assert.equal(touched, 0);
  assert.equal(validatePluginManifest(CATALOG_MANIFEST).events!.emits![0].delivery, "async");
  service.bind(undefined); await assert.rejects(service.list(), /not loaded/);
});
