import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ButtonBase } from "./button-base.js";

test("ButtonBase uses pointer cursor for interactive buttons", () => {
  const markup = renderToStaticMarkup(<ButtonBase>Save</ButtonBase>);

  assert.match(markup, /cursor-pointer/);
});

test("ButtonBase keeps loading buttons disabled even when disabled is explicitly false", () => {
  const markup = renderToStaticMarkup(
    <ButtonBase isLoading disabled={false}>
      Save
    </ButtonBase>
  );

  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /disabled:cursor-not-allowed/);
});
