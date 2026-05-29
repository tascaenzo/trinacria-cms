import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonView } from "./json-view.js";

test("JsonView renders pretty printed JSON", () => {
  const markup = renderToStaticMarkup(<JsonView title="Payload" value={{ ok: true }} />);

  assert.match(markup, /Payload/);
  assert.match(markup, /&quot;ok&quot;: true/);
});
