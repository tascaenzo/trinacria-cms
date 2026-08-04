import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Disclosure } from "./disclosure.js";

test("Disclosure renders native details and summary semantics", () => {
  const markup = renderToStaticMarkup(
    <Disclosure summary="Advanced settings" open>
      Content
    </Disclosure>
  );

  assert.match(markup, /<details/);
  assert.match(markup, /<summary/);
  assert.match(markup, /open=""/);
  assert.match(markup, /Advanced settings/);
});
