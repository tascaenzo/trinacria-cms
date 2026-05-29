import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconButton } from "./icon-button.js";

test("IconButton maps label to accessible name and title", () => {
  const markup = renderToStaticMarkup(<IconButton icon="plus" label="Create" />);

  assert.match(markup, /aria-label="Create"/);
  assert.match(markup, /title="Create"/);
  assert.match(markup, /lucide-plus/);
});
