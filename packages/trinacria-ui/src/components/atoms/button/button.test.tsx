import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./button.js";

test("Button defaults to type button and renders children", () => {
  const markup = renderToStaticMarkup(<Button>Save</Button>);

  assert.match(markup, /type="button"/);
  assert.match(markup, /Save/);
});
