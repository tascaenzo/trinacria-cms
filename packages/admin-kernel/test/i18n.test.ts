import assert from "node:assert/strict";
import test from "node:test";
import { createTranslate, defineI18nBundle } from "../src/lib/i18n.js";

const enBundle = defineI18nBundle({
  pluginId: "test-pack",
  dictionaries: {
    en: {
      "test.greeting": "Hello",
      "test.fallback_only": "English only"
    },
    it: {
      "test.greeting": "Ciao"
    }
  }
});

const fallbackBundle = defineI18nBundle({
  pluginId: "core-pack",
  dictionaries: {
    en: {
      "common.save": "Save",
      "common.cancel": "Cancel"
    }
  }
});

test("createTranslate returns the active locale value when available", () => {
  const t = createTranslate("it", [enBundle], "en");
  assert.equal(t("test.greeting"), "Ciao");
});

test("createTranslate falls back to English when key missing in active locale", () => {
  const t = createTranslate("it", [enBundle], "en");
  assert.equal(t("test.fallback_only"), "English only");
});

test("createTranslate falls back to fallback parameter when key missing everywhere", () => {
  const t = createTranslate("it", [enBundle], "en");
  assert.equal(t("missing.key", "Fallback Text"), "Fallback Text");
});

test("createTranslate returns the key itself when nothing is found", () => {
  const t = createTranslate("de", [enBundle], "en");
  assert.equal(t("completely.unknown"), "completely.unknown");
});

test("createTranslate merges multiple bundles", () => {
  const t = createTranslate("en", [enBundle, fallbackBundle], "en");
  assert.equal(t("test.greeting"), "Hello");
  assert.equal(t("common.save"), "Save");
});

test("createTranslate lets later bundles override keys from earlier ones", () => {
  const overrideBundle = defineI18nBundle({
    pluginId: "override-pack",
    dictionaries: {
      en: { "test.greeting": "Overridden" }
    }
  });
  const t = createTranslate("en", [enBundle, overrideBundle], "en");
  assert.equal(t("test.greeting"), "Overridden");
});

test("defineI18nBundle preserves type inference", () => {
  const bundle = defineI18nBundle({
    pluginId: "type-test",
    dictionaries: { en: { key: "value" } }
  });
  assert.equal(bundle.pluginId, "type-test");
  assert.equal(bundle.dictionaries.en?.key, "value");
});
