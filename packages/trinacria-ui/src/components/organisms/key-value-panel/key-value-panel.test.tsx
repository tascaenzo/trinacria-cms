import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KeyValueItem, KeyValuePanel } from "./key-value-panel.js";

test("KeyValuePanel renders key value items", () => {
  const markup = renderToStaticMarkup(
    <KeyValuePanel>
      <KeyValueItem label="Owner" value="kernel" />
    </KeyValuePanel>
  );

  assert.match(markup, /Owner/);
  assert.match(markup, /kernel/);
});
