import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { installDom, renderClient } from "../../../test-utils/client-render.js";
import { SearchField } from "./search-field.js";

test("SearchField renders a clear button only when it has a value", async () => {
  const restoreDom = installDom();

  try {
    const emptyView = await renderClient(<SearchField value="" onChange={() => undefined} />);
    assert.equal(document.querySelector('button[aria-label="Clear search"]'), null);
    await emptyView.unmount();

    const filledView = await renderClient(
      <SearchField value="abc" onChange={() => undefined} clearLabel="Reset" />
    );
    assert.ok(document.querySelector('button[aria-label="Reset"]'));
    await filledView.unmount();
  } finally {
    restoreDom();
  }
});
