import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SelectableCard } from "./selectable-card.js";

test("SelectableCard exposes its selection state", () => {
  const markup = renderToStaticMarkup(<SelectableCard selected>Editorial</SelectableCard>);

  assert.match(markup, /type="button"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /color-panel-strong/);
});
