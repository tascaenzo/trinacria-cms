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

test("Icon registry includes navigation and editor history icons", () => {
  assert.equal(ICON_NAMES.includes("arrow-left"), true);
  assert.match(renderToStaticMarkup(<Icon name="undo-2" />), /lucide-undo-2/);
  assert.match(renderToStaticMarkup(<Icon name="redo-2" />), /lucide-redo-2/);
});
