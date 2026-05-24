import assert from "node:assert/strict";
import test from "node:test";
import { isValidVersion, isValidVersionRange, satisfiesVersion } from "../src/runtime/plugin-manifest/semver.js";

test("isValidVersion validates strict semver", () => {
  assert.equal(isValidVersion("1.2.3"), true);
  assert.equal(isValidVersion("1.2"), false);
});

test("isValidVersionRange validates supported range grammar", () => {
  assert.equal(isValidVersionRange("^1.0.0"), true);
  assert.equal(isValidVersionRange(">=1.0.0 <2.0.0"), true);
  assert.equal(isValidVersionRange("^1.0.0 || ^2.0.0"), true);
  assert.equal(isValidVersionRange("latest"), false);
});

test("satisfiesVersion supports OR range groups", () => {
  assert.equal(satisfiesVersion("2.1.0", "^1.0.0 || ^2.0.0"), true);
  assert.equal(satisfiesVersion("3.0.0", "^1.0.0 || ^2.0.0"), false);
});
