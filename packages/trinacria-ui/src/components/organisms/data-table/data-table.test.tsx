import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableHeaderRow,
  DataTablePrimaryCell,
  DataTableRow,
  DataTableTable
} from "./data-table.js";

test("DataTable renders table composition or empty state", () => {
  const table = renderToStaticMarkup(
    <DataTable>
      <DataTableTable>
        <DataTableHead>
          <DataTableHeaderRow>
            <DataTableHeadCell>Name</DataTableHeadCell>
          </DataTableHeaderRow>
        </DataTableHead>
        <DataTableBody>
          <DataTableRow>
            <DataTablePrimaryCell meta="core">Settings</DataTablePrimaryCell>
            <DataTableCell>Status</DataTableCell>
          </DataTableRow>
        </DataTableBody>
      </DataTableTable>
    </DataTable>
  );
  const empty = renderToStaticMarkup(<DataTable empty={<p>No records</p>} />);

  assert.match(table, /<table/);
  assert.doesNotMatch(table, /class="hidden overflow-x-auto/);
  assert.match(table, /<th[^>]*scope="col"/);
  assert.match(table, /Settings/);
  assert.match(table, /core/);
  assert.match(empty, /No records/);
});
