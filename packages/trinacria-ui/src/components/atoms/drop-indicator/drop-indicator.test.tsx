import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DropIndicator } from "./drop-indicator.js";

test("DropIndicator stays invisible to assistive technology", () => {
  const markup = renderToStaticMarkup(<DropIndicator />);
  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /bg-\[color:var\(--color-focus\)\]/);
});
