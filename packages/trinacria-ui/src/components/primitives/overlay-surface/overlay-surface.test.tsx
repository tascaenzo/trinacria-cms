import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OverlaySurface } from "./overlay-surface.js";

test("OverlaySurface keeps borders subtle and applies variant-specific shadows", () => {
  const popover = renderToStaticMarkup(<OverlaySurface>Popover</OverlaySurface>);
  const modal = renderToStaticMarkup(<OverlaySurface variant="modal">Modal</OverlaySurface>);
  const drawer = renderToStaticMarkup(<OverlaySurface variant="drawer">Drawer</OverlaySurface>);

  assert.match(popover, /color-border/);
  assert.match(modal, /border-transparent/);
  assert.match(modal, /shadow-overlay/);
  assert.match(drawer, /border-0/);
  assert.match(drawer, /shadow-drawer/);
});
