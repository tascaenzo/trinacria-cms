import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FormSection } from "./form-section.js";

test("FormSection renders form metadata and content", () => {
  const markup = renderToStaticMarkup(
    <FormSection
      title="General"
      description="Base fields"
      error="Invalid"
      actions={<button>Save</button>}
    >
      <input />
    </FormSection>
  );

  assert.match(markup, /General/);
  assert.match(markup, /Base fields/);
  assert.match(markup, /Invalid/);
  assert.match(markup, /Save/);
});

test("FormSection supports nested heading hierarchy", () => {
  const markup = renderToStaticMarkup(<FormSection headingLevel={3} title="Delivery" />);

  assert.match(markup, /<h3[^>]*>Delivery<\/h3>/);
});

test("FormSection supports an open form layout without a panel", () => {
  const markup = renderToStaticMarkup(
    <FormSection variant="plain" title="Identity">
      <input />
    </FormSection>
  );

  assert.match(markup, /<section/);
  assert.doesNotMatch(markup, /rounded-/);
});
