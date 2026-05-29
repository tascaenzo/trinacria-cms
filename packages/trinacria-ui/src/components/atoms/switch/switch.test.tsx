import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Switch } from "./switch.js";

test("Switch preserves aria wiring without referencing a missing hint id", () => {
  const markup = renderToStaticMarkup(
    <Switch
      id="enabled"
      label="Enabled"
      description="Enable feature"
      error="Required"
      aria-describedby="external-description"
    />
  );

  assert.match(markup, /aria-describedby="external-description enabled-description enabled-error"/);
  assert.doesNotMatch(markup, /enabled-hint/);
});
