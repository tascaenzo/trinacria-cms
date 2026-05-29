import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, FieldDescription, FieldError, FieldGroup, FieldHint, FieldLabel } from "./field.js";

test("Field primitives render semantic field copy", () => {
  const markup = renderToStaticMarkup(
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="tenant">Tenant</FieldLabel>
        <FieldDescription>Description</FieldDescription>
        <FieldHint>Hint</FieldHint>
        <FieldError>Error</FieldError>
      </Field>
    </FieldGroup>
  );

  assert.match(markup, /for="tenant"/);
  assert.match(markup, /Description/);
  assert.match(markup, /Hint/);
  assert.match(markup, /Error/);
});
