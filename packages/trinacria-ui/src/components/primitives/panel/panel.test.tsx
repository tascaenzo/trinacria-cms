import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Panel } from "./panel.js";

test("Panel renders tone elevation and radius classes", () => {
  const markup = renderToStaticMarkup(
    <Panel tone="dashed" elevation="sm" radius="xl">
      Content
    </Panel>
  );

  assert.match(markup, /border-dashed/);
  assert.match(markup, /shadow-surface/);
  assert.match(markup, /radius-overlay/);
});
