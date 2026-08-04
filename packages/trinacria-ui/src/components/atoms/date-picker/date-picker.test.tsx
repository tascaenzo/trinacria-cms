import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DatePicker } from "./date-picker.js";

test("DatePicker does not render a reset action while disabled", () => {
  const enabledMarkup = renderToStaticMarkup(<DatePicker defaultValue="2026-04-11" />);
  const disabledMarkup = renderToStaticMarkup(<DatePicker defaultValue="2026-04-11" disabled />);

  assert.match(enabledMarkup, /Azzera data/);
  assert.doesNotMatch(disabledMarkup, /Azzera data/);
});
