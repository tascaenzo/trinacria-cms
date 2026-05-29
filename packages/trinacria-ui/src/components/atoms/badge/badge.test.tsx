import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Badge } from "./badge.js";

test("Badge renders children and tone classes", () => {
  const markup = renderToStaticMarkup(<Badge tone="success">Healthy</Badge>);

  assert.match(markup, /Healthy/);
  assert.match(markup, /color-success-bg/);
});
