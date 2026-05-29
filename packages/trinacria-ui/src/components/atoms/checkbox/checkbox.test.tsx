import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Checkbox } from "./checkbox.js";

test("Checkbox preserves aria wiring without referencing a missing hint id", () => {
  const markup = renderToStaticMarkup(
    <Checkbox
      id="terms"
      label="Terms"
      description="Accept terms"
      error="Required"
      aria-describedby="external-description"
    />
  );

  assert.match(markup, /aria-describedby="external-description terms-description terms-error"/);
  assert.doesNotMatch(markup, /terms-hint/);
});
