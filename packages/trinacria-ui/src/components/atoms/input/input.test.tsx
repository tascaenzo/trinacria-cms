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

test("Input does not reuse a submission name as its DOM id", () => {
  const markup = renderToStaticMarkup(
    <>
      <Input name="email" label="Email principale" />
      <Input name="email" label="Email secondaria" />
    </>
  );
  const ids = Array.from(markup.matchAll(/<input[^>]*id="([^"]+)"/g), (match) => match[1]);

  assert.equal(ids.length, 2);
  assert.notEqual(ids[0], ids[1]);
});
