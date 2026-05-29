import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OverlaySurface } from "./overlay-surface.js";

test("OverlaySurface applies variant-specific shadow classes", () => {
  const modal = renderToStaticMarkup(<OverlaySurface variant="modal">Modal</OverlaySurface>);
  const drawer = renderToStaticMarkup(<OverlaySurface variant="drawer">Drawer</OverlaySurface>);

  assert.match(modal, /shadow-overlay/);
  assert.match(drawer, /shadow-drawer/);
});
