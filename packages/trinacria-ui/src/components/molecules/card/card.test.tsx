import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardHeading
} from "./card.js";

test("Card renders header metadata and composition primitives", () => {
  const markup = renderToStaticMarkup(
    <Card padding="none" title="Settings" eyebrow="Core">
      <CardHeader>
        <CardHeading icon="settings-2" title="Title" description="Description" actions="Open" />
      </CardHeader>
      <CardContent>Content</CardContent>
      <CardActions>Actions</CardActions>
    </Card>
  );

  assert.match(markup, /Core/);
  assert.match(markup, /Settings/);
  assert.match(markup, /Title/);
  assert.match(markup, /Description/);
  assert.match(markup, /lucide-settings/);
  assert.match(markup, /Open/);
  assert.match(markup, /Actions/);
  assert.match(markup, /overflow-hidden/);
  assert.match(markup, /border-b/);
});
