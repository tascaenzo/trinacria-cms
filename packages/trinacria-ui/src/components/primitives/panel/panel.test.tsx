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

test("Panel custom tone leaves surface colors to composed components", () => {
  const markup = renderToStaticMarkup(<Panel tone="custom">Content</Panel>);

  assert.doesNotMatch(markup, /color-surface/);
  assert.doesNotMatch(markup, /color-panel-soft/);
});

test("Panel preserves the requested semantic element", () => {
  const markup = renderToStaticMarkup(<Panel as="section">Content</Panel>);

  assert.match(markup, /^<section/);
});
