import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SummaryCard, SummaryGrid } from "./summary-grid.js";

test("SummaryGrid renders summary cards", () => {
  const markup = renderToStaticMarkup(
    <SummaryGrid>
      <SummaryCard label="Plugins" value="12" description="Installed" badge={<span>ok</span>} />
    </SummaryGrid>
  );

  assert.match(markup, /Plugins/);
  assert.match(markup, /12/);
  assert.match(markup, /Installed/);
  assert.match(markup, /ok/);
});
