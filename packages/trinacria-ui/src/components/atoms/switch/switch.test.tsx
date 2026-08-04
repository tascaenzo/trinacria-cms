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

test("Switch supports a compact visual control with an accessible label", () => {
  const markup = renderToStaticMarkup(<Switch compact label="Enable notifications" />);

  assert.match(markup, /inline-flex items-center border-0/);
  assert.match(markup, /<span class="grid gap-1 sr-only">/);
  assert.match(markup, />Enable notifications</);
});
