import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildFormControlAria,
  formControlClassName,
  FormControlShell,
  FormControlSurface
} from "./form-control.js";

test("buildFormControlAria composes describedby and error message ids", () => {
  assert.deepEqual(
    buildFormControlAria({
      describedBy: "external",
      error: "Required",
      errorId: "field-error",
      hint: "Hint",
      hintId: "field-hint"
    }),
    { describedBy: "external field-hint field-error", errorMessage: "field-error" }
  );
});

test("FormControlShell renders label hint and error ids", () => {
  const markup = renderToStaticMarkup(
    <FormControlShell
      controlId="field"
      error="Required"
      errorId="field-error"
      hint="Hint"
      hintId="field-hint"
      label="Label"
      labelId="field-label"
    >
      <input />
    </FormControlShell>
  );

  assert.match(markup, /id="field-label"/);
  assert.match(markup, /id="field-error"/);
  assert.match(markup, /id="field-hint"/);
});

test("FormControlSurface reflects disabled and error state classes", () => {
  const className = formControlClassName({ disabled: true, error: "Required" });
  const markup = renderToStaticMarkup(<FormControlSurface disabled error="Required" />);

  assert.match(className, /cursor-not-allowed/);
  assert.match(className, /color-danger-bg/);
  assert.match(markup, /cursor-not-allowed/);
});

test("form controls use quiet hover and focus borders", () => {
  const className = formControlClassName();

  assert.match(className, /color-border\)/);
  assert.match(className, /hover:border-\[color:var\(--color-accent-border\)\]/);
  assert.match(className, /focus:border-\[color:var\(--color-border-strong\)\]/);
  assert.match(className, /focus:ring-1/);
  assert.doesNotMatch(className, /focus:ring-2/);
});
