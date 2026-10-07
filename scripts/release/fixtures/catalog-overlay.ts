const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error("Typed overlay roundtrip mismatch");
  }
};

import { createCmsSdkClientCore } from "@trinacria-cms/sdk/runtime";
import { createPluginSdk } from "./catalog-sdk/index.js";
export async function verifyCatalogOverlay(baseUrl: string, token: string) {
  const official = createCmsSdkClientCore({ baseUrl, getAccessToken: () => token });
  const overlay = createPluginSdk(official);
  const created = await overlay.catalog.createCatalogItem({
    body: { name: "Overlay item", priceCents: 2500 }
  });
  assert.equal(created.data.priceCents, 2500);
  const fetched = await overlay.catalog.getCatalogItem({ path: { id: created.data.id } });
  assert.equal(fetched.data.name, "Overlay item");
  const updated = await overlay.catalog.updateCatalogItem({
    path: { id: created.data.id },
    body: {
      expectedVersion: created.data.version,
      input: { name: "Overlay updated", priceCents: 2700 }
    }
  });
  assert.equal(updated.data.version, 2);
  const deleted = await overlay.catalog.deleteCatalogItem({
    path: { id: created.data.id },
    body: { expectedVersion: updated.data.version }
  });
  assert.equal(deleted.data.deleted, true);
  assert.equal("catalog" in official, false);
}
