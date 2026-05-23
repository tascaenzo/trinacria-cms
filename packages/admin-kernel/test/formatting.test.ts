import assert from "node:assert/strict";
import test from "node:test";
import { formatDateTime, parseCommaSeparatedList, tryParseJson } from "../src/lib/formatting.js";

test("formatDateTime returns placeholder for empty input", () => {
  assert.equal(formatDateTime(undefined), "-");
  assert.equal(formatDateTime(""), "-");
});

test("formatDateTime returns raw string for unparseable dates", () => {
  assert.equal(formatDateTime("not-a-date"), "not-a-date");
});

test("formatDateTime formats valid ISO strings", () => {
  const result = formatDateTime("2026-05-22T10:30:00Z");
  assert.ok(result.includes("2026"));
  assert.ok(result.includes("May") || result.includes("05"));
});

test("parseCommaSeparatedList splits and trims entries", () => {
  assert.deepEqual(parseCommaSeparatedList("a, b, c"), ["a", "b", "c"]);
});

test("parseCommaSeparatedList handles single entry", () => {
  assert.deepEqual(parseCommaSeparatedList("only"), ["only"]);
});

test("parseCommaSeparatedList filters empty entries", () => {
  assert.deepEqual(parseCommaSeparatedList("a,,b,"), ["a", "b"]);
});

test("parseCommaSeparatedList returns empty array for empty string", () => {
  assert.deepEqual(parseCommaSeparatedList(""), []);
});

test("tryParseJson parses valid JSON", () => {
  assert.deepEqual(tryParseJson('{"key": "value"}'), { key: "value" });
  assert.equal(tryParseJson("42"), 42);
  assert.equal(tryParseJson('"string"'), "string");
});

test("tryParseJson throws on invalid JSON", () => {
  assert.throws(() => tryParseJson("{invalid}"));
});
