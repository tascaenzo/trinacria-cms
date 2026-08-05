import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionBar, ContentSection, PageHeader } from "./page-section.js";

test("PageHeader and ActionBar render page chrome", () => {
  const markup = renderToStaticMarkup(
    <>
      <PageHeader
        eyebrow="Core"
        title="Users"
        description="Manage users"
        actions={<button>New</button>}
      />
      <ActionBar>Filters</ActionBar>
      <ContentSection title="Document" description="Linear content">
        Content
      </ContentSection>
    </>
  );

  assert.match(markup, /Core/);
  assert.match(markup, /Users/);
  assert.match(markup, /Manage users/);
  assert.match(markup, /Filters/);
  assert.match(markup, /Linear content/);
});
