import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FilterBar } from "./filter-bar.js";

test("FilterBar renders form content actions and summary", () => {
  const markup = renderToStaticMarkup(
    <FilterBar summary="3 results" actions={<button>Apply</button>}>
      <input name="q" />
    </FilterBar>
  );

  assert.match(markup, /<form/);
  assert.match(markup, /name="q"/);
  assert.match(markup, /Apply/);
  assert.match(markup, /3 results/);
});
