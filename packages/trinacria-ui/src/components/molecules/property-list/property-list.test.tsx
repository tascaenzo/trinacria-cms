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

test("PropertyList renders a divider-led linear record detail", () => {
  const markup = renderToStaticMarkup(
    <PropertyList variant="linear">
      <PropertyItem label="Email" value="operator@trinacria.test" />
    </PropertyList>
  );

  assert.match(markup, /divide-y/);
  assert.match(markup, /sm:grid-cols/);
});

test("PropertyList renders two-tone key value rows", () => {
  const markup = renderToStaticMarkup(
    <PropertyList variant="key-value">
      <PropertyItem label="Email" value="operator@trinacria.test" />
    </PropertyList>
  );

  assert.match(markup, /color-panel-soft/);
  assert.match(markup, /minmax\(14rem/);
});
