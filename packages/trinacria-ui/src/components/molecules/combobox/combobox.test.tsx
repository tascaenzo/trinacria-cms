import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Combobox } from "./combobox.js";

test("Combobox disables its hidden submitted value when disabled", () => {
  const markup = renderToStaticMarkup(
    <Combobox
      name="plugin"
      value="core pack"
      disabled
      options={[{ label: "Core Pack", value: "core pack" }]}
    />
  );

  assert.match(markup, /type="hidden"/);
  assert.match(markup, /name="plugin"/);
  assert.match(markup, /value="core pack"/);
  assert.match(markup, /disabled=""/);
});
