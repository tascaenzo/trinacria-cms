import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Pagination } from "./pagination.js";

test("Pagination guards invalid pageSize and totalItems without throwing", () => {
  const markup = renderToStaticMarkup(
    <Pagination
      page={1}
      pageSize={0}
      totalItems={Number.NaN}
      pageSizeOptions={[0, -10]}
      onPageSizeChange={() => undefined}
    />
  );

  assert.match(markup, /0-0 of 0/);
  assert.match(markup, /value="1"/);
});
