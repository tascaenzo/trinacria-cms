import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PropertyItem, PropertyList } from "./property-list.js";

test("PropertyList renders description list items", () => {
  const markup = renderToStaticMarkup(
    <PropertyList columns={2}>
      <PropertyItem label="Owner" value="kernel" hint="system" />
    </PropertyList>
  );

  assert.match(markup, /<dl/);
  assert.match(markup, /Owner/);
  assert.match(markup, /kernel/);
  assert.match(markup, /system/);
});
