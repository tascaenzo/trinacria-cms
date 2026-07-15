import assert from "node:assert/strict";
import test from "node:test";
import { createRemoteI18nBundle } from "../src/lib/remote-i18n.js";

test("createRemoteI18nBundle adapts a Core translation response", () => {
  assert.deepEqual(
    createRemoteI18nBundle({ data: { locale: "it", messages: { "common.save": "Salva" } } }),
    { pluginId: "cms-runtime", dictionaries: { it: { "common.save": "Salva" } } }
  );
});

test("createRemoteI18nBundle rejects malformed Core translation responses", () => {
  assert.equal(createRemoteI18nBundle({ data: { locale: "it", messages: ["Salva"] } }), null);
});
