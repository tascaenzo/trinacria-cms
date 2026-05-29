import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InfoCard } from "./info-card.js";

test("InfoCard renders eyebrow title description and action", () => {
  const markup = renderToStaticMarkup(
    <InfoCard
      eyebrow="Runtime"
      title="Healthy"
      description="All systems go"
      action={<button>Open</button>}
    />
  );

  assert.match(markup, /Runtime/);
  assert.match(markup, /Healthy/);
  assert.match(markup, /All systems go/);
  assert.match(markup, /Open/);
});
