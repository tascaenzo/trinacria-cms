import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Input } from "./input.js";

test("Input preserves generated aria error and description wiring over incoming props", () => {
  const markup = renderToStaticMarkup(
    <Input
      id="email"
      label="Email"
      error="Required"
      hint="Work email"
      aria-describedby="external-description"
      aria-invalid={false}
    />
  );

  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /aria-describedby="external-description email-hint email-error"/);
});
