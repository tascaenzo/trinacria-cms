import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RadioGroup } from "./radio-group.js";

test("RadioGroup preserves generated aria error and hint wiring over incoming props", () => {
  const markup = renderToStaticMarkup(
    <RadioGroup
      id="mode"
      label="Mode"
      name="mode"
      value="manual"
      error="Required"
      hint="Choose one"
      aria-describedby="external-description"
      options={[
        { label: "Manual", value: "manual" },
        { label: "Auto", value: "auto" }
      ]}
    />
  );

  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /aria-describedby="external-description mode-hint mode-error"/);
});
