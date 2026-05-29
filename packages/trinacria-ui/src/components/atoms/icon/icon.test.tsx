import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ICON_NAMES, Icon } from "./icon.js";

test("Icon registry exposes names and renders known icons", () => {
  const markup = renderToStaticMarkup(<Icon name="search" aria-label="Search" />);

  assert.equal(ICON_NAMES.includes("search"), true);
  assert.match(markup, /aria-label="Search"/);
  assert.match(markup, /lucide-search/);
});
