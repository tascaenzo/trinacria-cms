import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Textarea } from "./textarea.js";

test("Textarea preserves generated aria error wiring over incoming props", () => {
  const markup = renderToStaticMarkup(
    <Textarea id="bio" error="Required" aria-describedby="external-description" />
  );

  assert.match(markup, /aria-describedby="external-description bio-error"/);
});
