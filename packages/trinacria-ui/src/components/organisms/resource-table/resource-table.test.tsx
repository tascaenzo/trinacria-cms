import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ResourceTable,
  ResourceTableCell,
  ResourceTableElement,
  ResourceTableHeadCell,
  ResourceTableHeaderRow,
  ResourceTablePrimaryCell,
  ResourceTableRow
} from "./resource-table.js";

test("ResourceTable renders table composition or empty state", () => {
  const table = renderToStaticMarkup(
    <ResourceTable>
      <ResourceTableElement>
        <thead>
          <ResourceTableHeaderRow>
            <ResourceTableHeadCell>Name</ResourceTableHeadCell>
          </ResourceTableHeaderRow>
        </thead>
        <tbody>
          <ResourceTableRow>
            <ResourceTablePrimaryCell meta="admin">Alice</ResourceTablePrimaryCell>
            <ResourceTableCell>Active</ResourceTableCell>
          </ResourceTableRow>
        </tbody>
      </ResourceTableElement>
    </ResourceTable>
  );
  const empty = renderToStaticMarkup(<ResourceTable empty={<p>No resources</p>} />);

  assert.match(table, /<table/);
  assert.match(table, /Alice/);
  assert.match(table, /admin/);
  assert.match(empty, /No resources/);
});
