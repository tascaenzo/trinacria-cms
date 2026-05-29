import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Eyebrow } from "./eyebrow.js";

test("Eyebrow renders uppercase supporting text", () => {
  const markup = renderToStaticMarkup(<Eyebrow>Kernel</Eyebrow>);

  assert.match(markup, /Kernel/);
  assert.match(markup, /uppercase/);
});
