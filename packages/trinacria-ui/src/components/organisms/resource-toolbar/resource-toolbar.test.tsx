import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResourceToolbar } from "./resource-toolbar.js";

test("ResourceToolbar renders leading filters and actions", () => {
  const markup = renderToStaticMarkup(
    <ResourceToolbar leading="Users" filters={<input name="q" />} actions={<button>New</button>} />
  );

  assert.match(markup, /Users/);
  assert.match(markup, /name="q"/);
  assert.match(markup, /New/);
});
