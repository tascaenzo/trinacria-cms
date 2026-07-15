import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeBackofficeAccent,
  normalizeBackofficeTheme
} from "../src/lib/backoffice-theme.js";

test("backoffice theme helpers accept supported values and fall back safely", () => {
  assert.equal(normalizeBackofficeTheme("dark"), "dark");
  assert.equal(normalizeBackofficeTheme("unknown"), "light");
  assert.equal(normalizeBackofficeAccent("ocean"), "ocean");
  assert.equal(normalizeBackofficeAccent("unknown"), "neutral");
});
