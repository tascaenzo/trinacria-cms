import assert from "node:assert/strict";
import test from "node:test";
import axe from "axe-core";
import React from "react";
import { Input } from "./components/atoms/input/input.js";
import { Select } from "./components/atoms/select/select.js";
import { Disclosure } from "./components/molecules/disclosure/disclosure.js";
import { FeedbackBanner } from "./components/molecules/feedback/feedback.js";
import { Pagination } from "./components/molecules/pagination/pagination.js";
import { SelectableCard } from "./components/molecules/selectable-card/selectable-card.js";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableHeaderRow,
  DataTableRow,
  DataTableTable
} from "./components/organisms/data-table/data-table.js";
import { installDom, renderClient } from "./test-utils/client-render.js";

test("core form, feedback, table and pagination primitives pass axe semantics", async () => {
  const restoreDom = installDom();

  try {
    const view = await renderClient(
      <main>
        <h1>Impostazioni</h1>
        <Input label="Nome" name="name" hint="Nome visualizzato" />
        <Select label="Lingua" name="locale" defaultValue="it">
          <option value="it">Italiano</option>
        </Select>
        <FeedbackBanner tone="success" message="Impostazioni salvate" />
        <Disclosure summary="Impostazioni avanzate">
          <p>Configurazione opzionale</p>
        </Disclosure>
        <SelectableCard selected>Editorial pack</SelectableCard>
        <DataTable>
          <DataTableTable>
            <DataTableHead>
              <DataTableHeaderRow>
                <DataTableHeadCell>Nome</DataTableHeadCell>
              </DataTableHeaderRow>
            </DataTableHead>
            <DataTableBody>
              <DataTableRow>
                <DataTableCell>Trinacria</DataTableCell>
              </DataTableRow>
            </DataTableBody>
          </DataTableTable>
        </DataTable>
        <Pagination page={1} pageSize={10} totalItems={1} />
      </main>
    );
    const result = await axe.run(view.container, {
      rules: { "color-contrast": { enabled: false } }
    });

    assert.deepEqual(
      result.violations.map((violation) => violation.id),
      []
    );
    await view.unmount();
  } finally {
    restoreDom();
  }
});
