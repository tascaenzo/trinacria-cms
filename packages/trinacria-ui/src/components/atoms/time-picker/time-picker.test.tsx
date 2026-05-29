import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TimePicker } from "./time-picker.js";

test("TimePicker guards invalid minuteStep values without hanging during render", () => {
  assert.doesNotThrow(() => {
    renderToStaticMarkup(<TimePicker minuteStep={0} />);
    renderToStaticMarkup(<TimePicker minuteStep={-5} />);
    renderToStaticMarkup(<TimePicker minuteStep={0.5} />);
  });
});
