import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DateTimePicker } from "./date-time-picker.js";

test("DateTimePicker preserves generated aria error and hint wiring over incoming props", () => {
  const markup = renderToStaticMarkup(
    <DateTimePicker
      id="publish"
      label="Publish"
      error="Required"
      hint="Choose date and time"
      aria-describedby="external-description"
    />
  );

  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /aria-describedby="external-description publish-hint publish-error"/);
});
