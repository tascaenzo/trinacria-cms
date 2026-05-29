import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Select } from "./select.js";

test("Select preserves generated aria error wiring over incoming props", () => {
  const markup = renderToStaticMarkup(
    <Select id="role" error="Required" aria-describedby="external-description">
      <option value="admin">Admin</option>
    </Select>
  );

  assert.match(markup, /aria-describedby="external-description role-error"/);
});
