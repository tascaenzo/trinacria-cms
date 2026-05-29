import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BodyText } from "./text.js";

test("BodyText renders the requested tone", () => {
  const markup = renderToStaticMarkup(<BodyText tone="subtle">Help text</BodyText>);

  assert.match(markup, /Help text/);
  assert.match(markup, /color-ink-subtle/);
});
