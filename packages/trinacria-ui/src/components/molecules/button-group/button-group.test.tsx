import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ButtonGroup } from "./button-group.js";

test("ButtonGroup exposes role group and orientation classes", () => {
  const markup = renderToStaticMarkup(
    <ButtonGroup orientation="vertical" wrap={false}>
      <button>One</button>
    </ButtonGroup>
  );

  assert.match(markup, /role="group"/);
  assert.match(markup, /flex-col/);
});
