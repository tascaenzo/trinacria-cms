import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState, ErrorBanner, FeedbackBanner } from "./feedback.js";

test("Feedback components render status copy", () => {
  const banner = renderToStaticMarkup(
    <FeedbackBanner tone="danger" title="Problem" message="Failed" />
  );
  const error = renderToStaticMarkup(<ErrorBanner message="Broken" />);
  const empty = renderToStaticMarkup(
    <EmptyState title="Empty" text="No data" action={<button>Add</button>} />
  );

  assert.match(banner, /Problem/);
  assert.match(banner, /color-danger-bg/);
  assert.match(error, /Broken/);
  assert.match(empty, /No data/);
  assert.match(empty, /Add/);
});
