import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DetailSection } from "./detail-section.js";

test("DetailSection renders title description actions and body", () => {
  const markup = renderToStaticMarkup(
    <DetailSection
      title="Plugin"
      eyebrow="Core"
      description="Details"
      actions={<button>Edit</button>}
    >
      Content
    </DetailSection>
  );

  assert.match(markup, /Plugin/);
  assert.match(markup, /Core/);
  assert.match(markup, /Details/);
  assert.match(markup, /Edit/);
  assert.match(markup, /Content/);
});
