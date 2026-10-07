import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidVersion,
  isValidVersionRange,
  satisfiesVersion
} from "../src/runtime/plugin-manifest/semver.js";

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

test("npm caret bounds, metadata, comparators and prerelease admission", () => {
  const cases: [string, string, boolean][] = [
    ["0.0.3", "^0.0.3", true], ["0.0.4", "^0.0.3", false],
    ["0.1.9", "^0.1.0", true], ["0.2.0", "^0.1.0", false],
    ["1.9.0", "^1.2.3", true], ["2.0.0", "^1.2.3", false],
    ["1.2.9", "~1.2.3", true], ["1.3.0", "~1.2.3", false],
    ["2.1.0", ">=2.0.0 <3.0.0", true], ["1.2.3+build.4", "1.2.x", true],
    ["0.2.0-beta.2", "^0.2.0", false], ["0.2.0-beta.2", "^0.2.0-beta.1", true],
    ["0.3.0-beta.1", "^0.2.0-beta.1", false], ["1.2.3-beta.1", "*", false],
    ["invalid", "*", false], ["1.2.3", "latest", false]
  ];
  for (const [version, range, expected] of cases) {
    assert.equal(satisfiesVersion(version, range), expected, `${version} ${range}`);
  }
  for (const invalid of ["01.2.3", "1.2.3-01", "1.2.3-", "1.2", ""]) {
    assert.equal(isValidVersion(invalid), false, invalid);
  }
});
