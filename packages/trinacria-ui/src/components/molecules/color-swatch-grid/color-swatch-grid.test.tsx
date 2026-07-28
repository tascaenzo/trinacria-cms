import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ColorSwatchGrid } from "./color-swatch-grid.js";

test("ColorSwatchGrid exposes selected swatches as pressed buttons", () => {
  const markup = renderToStaticMarkup(
    <ColorSwatchGrid
      label="Colore"
      options={[{ value: "blue", label: "Blu", backgroundColor: "#e7f3f8" }]}
      selected="blue"
      onSelect={() => undefined}
    />
  );
  assert.match(markup, /role="group"/);
  assert.match(markup, /aria-pressed="true"/);
});
