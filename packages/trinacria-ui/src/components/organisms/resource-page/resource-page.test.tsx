import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResourcePage } from "./resource-page.js";

test("ResourcePage renders header toolbar feedback sidebar and content", () => {
  const markup = renderToStaticMarkup(
    <ResourcePage header="Header" toolbar="Toolbar" feedback="Feedback" sidebar="Sidebar">
      Content
    </ResourcePage>
  );

  assert.match(markup, /Header/);
  assert.match(markup, /Toolbar/);
  assert.match(markup, /Feedback/);
  assert.match(markup, /Sidebar/);
  assert.match(markup, /Content/);
});
