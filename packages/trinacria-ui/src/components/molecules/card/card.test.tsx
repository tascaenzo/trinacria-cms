import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Card, CardActions, CardContent, CardDescription, CardHeader, CardTitle } from "./card.js";

test("Card renders header metadata and composition primitives", () => {
  const markup = renderToStaticMarkup(
    <Card title="Settings" eyebrow="Core">
      <CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Description</CardDescription>
      </CardHeader>
      <CardContent>Content</CardContent>
      <CardActions>Actions</CardActions>
    </Card>
  );

  assert.match(markup, /Core/);
  assert.match(markup, /Settings/);
  assert.match(markup, /Title/);
  assert.match(markup, /Actions/);
});
