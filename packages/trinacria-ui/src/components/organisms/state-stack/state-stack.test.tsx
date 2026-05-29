import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StateStack } from "./state-stack.js";

test("StateStack prioritizes loading then empty then content", () => {
  const loading = renderToStaticMarkup(
    <StateStack isLoading loading="Loading" empty="Empty">
      Content
    </StateStack>
  );
  const empty = renderToStaticMarkup(
    <StateStack isEmpty empty="Empty">
      Content
    </StateStack>
  );
  const content = renderToStaticMarkup(<StateStack error="Warning">Content</StateStack>);

  assert.match(loading, /Loading/);
  assert.doesNotMatch(loading, /Content/);
  assert.match(empty, /Empty/);
  assert.doesNotMatch(empty, /Content/);
  assert.match(content, /Warning/);
  assert.match(content, /Content/);
});
