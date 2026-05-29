import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NumberInput } from "./number-input.js";

test("NumberInput preserves generated aria error wiring over incoming props", () => {
  const markup = renderToStaticMarkup(
    <NumberInput id="quota" error="Required" aria-describedby="external-description" />
  );

  assert.match(markup, /aria-describedby="external-description quota-error"/);
});
