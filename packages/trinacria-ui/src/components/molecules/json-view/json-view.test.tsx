import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonView, JsonViewDialog } from "./json-view.js";

test("JsonView renders an inspectable JSON tree with toolbar actions", () => {
  const markup = renderToStaticMarkup(
    <JsonView title="Payload" value={{ ok: true, nested: { count: 2 } }} />
  );

  assert.match(markup, /Payload/);
  assert.match(markup, /Copy JSON/);
  assert.match(markup, /Collapse JSON/);
  assert.doesNotMatch(markup, /Expand JSON/);
  assert.match(markup, /&quot;ok&quot;/);
  assert.match(markup, /true/);
  assert.match(markup, /&quot;nested&quot;/);
  assert.match(markup, /&quot;count&quot;/);
});

test("JsonViewDialog renders JSON through the shared dialog primitive", () => {
  const markup = renderToStaticMarkup(
    <JsonViewDialog
      open
      title="Payload preview"
      payloadTitle="Backend payload"
      value={{ id: "user_1" }}
      onClose={() => undefined}
    />
  );

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /Payload preview/);
  assert.match(markup, /Backend payload/);
  assert.match(markup, /&quot;id&quot;/);
});
