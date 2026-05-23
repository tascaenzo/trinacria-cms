import assert from "node:assert/strict";
import test from "node:test";
import {
  createIdleAsyncActionState,
  readOptionalString,
  readRequiredString,
  readStringArray
} from "../src/runtime/action-state.js";

test("createIdleAsyncActionState returns initial state", () => {
  const state = createIdleAsyncActionState();
  assert.equal(state.ok, false);
  assert.equal(state.error, null);
  assert.equal(state.data, null);
});

test("readRequiredString extracts and trims string values", () => {
  const form = new FormData();
  form.set("name", "  John  ");
  assert.equal(readRequiredString(form, "name"), "John");
});

test("readRequiredString throws on missing field", () => {
  const form = new FormData();
  assert.throws(() => readRequiredString(form, "missing"), /Missing form field/);
});

test("readRequiredString throws on empty string", () => {
  const form = new FormData();
  form.set("name", "   ");
  assert.throws(() => readRequiredString(form, "name"), /Field cannot be empty/);
});

test("readRequiredString throws on non-string FormDataEntryValue", () => {
  const form = new FormData();
  const file = new File([""], "test.txt");
  form.set("file", file);
  assert.throws(() => readRequiredString(form, "file"), /Missing form field/);
});

test("readOptionalString returns undefined for missing field", () => {
  const form = new FormData();
  assert.equal(readOptionalString(form, "missing"), undefined);
});

test("readOptionalString returns undefined for whitespace-only", () => {
  const form = new FormData();
  form.set("name", "   ");
  assert.equal(readOptionalString(form, "name"), undefined);
});

test("readOptionalString returns trimmed value", () => {
  const form = new FormData();
  form.set("name", "  Hello  ");
  assert.equal(readOptionalString(form, "name"), "Hello");
});

test("readStringArray collects all values for a key", () => {
  const form = new FormData();
  form.append("tags", "a");
  form.append("tags", "b");
  form.append("tags", "c");
  assert.deepEqual(readStringArray(form, "tags"), ["a", "b", "c"]);
});

test("readStringArray trims and filters empty", () => {
  const form = new FormData();
  form.append("tags", "  x  ");
  form.append("tags", "");
  form.append("tags", "y");
  assert.deepEqual(readStringArray(form, "tags"), ["x", "y"]);
});

test("readStringArray returns empty array when key not present", () => {
  const form = new FormData();
  assert.deepEqual(readStringArray(form, "missing"), []);
});
